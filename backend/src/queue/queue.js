import { Queue, Worker } from "bullmq";
import fs from "fs/promises";
import path from "path";
import {
  formatBytes,
  formatAriaSpeed,
  ARIA2_BT_REQUEST_PEER_SPEED_LIMIT,
  MAX_DOWNLOAD_SIZE,
  MAX_GLOBAL_DOWNLOAD_SPEED
} from "../config.js";
import Download from "../models/Download.js";
import User from "../models/User.js";
import {
  addTorrent,
  addUri,
  cancel,
  changeGlobalOptions,
  resume,
  tellStatus
} from "../services/aria2.js";
import { releaseStorage, reserveForDownload } from "../services/quota.js";
import {
  getAria2StoragePath,
  mapAria2Files,
  resolveStoragePath
} from "../services/storage.js";
import { getTorrentContentSize } from "../services/torrentMetadata.js";
import { analyzeDownload } from "../services/analyzer.js";
import { serializeDownload } from "../services/downloadView.js";
import { ariaSpeedOption } from "../services/speedLimits.js";

const connection = { url: process.env.REDIS_URL || "redis://127.0.0.1:6379" };
export const downloadQueue = new Queue("downloads", { connection });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const room = (userId) => `user:${userId}`;

function getStatusSize(status, field, fileField) {
  const reported = Number(status[field] || 0);
  if (reported > 0) return reported;
  return (status.files || []).reduce(
    (total, file) => total + Number(file[fileField] || 0),
    0
  );
}

function normalizeStatus(status) {
  if (status === "active") return "downloading";
  if (status === "waiting") return "queued";
  if (status === "complete") return "completed";
  return status;
}

function speedFor(download, user) {
  return user.maxDownloadSpeed;
}

function emitUpdate(io, download) {
  io.to(room(download.userId.toString())).emit("download:update", serializeDownload(download));
}

async function setLimitExceeded(download, io, gid, totalSize, completedSize) {
  if (gid) await cancel(gid);
  await fs.rm(resolveStoragePath(download.storagePath), { recursive: true, force: true });
  await releaseStorage(download);
  download.status = "LIMIT_EXCEEDED";
  download.errorMessage = `This torrent contains more than the allowed ${formatBytes(MAX_DOWNLOAD_SIZE)}.`;
  download.totalSize = totalSize;
  download.completedSize = completedSize;
  await download.save();
  emitUpdate(io, download);
}

async function markQuotaExceeded(download, io, gid, size) {
  if (gid) await cancel(gid);
  await fs.rm(resolveStoragePath(download.storagePath), { recursive: true, force: true });
  await releaseStorage(download);
  download.status = "error";
  download.errorMessage = "This download exceeds your remaining storage quota.";
  download.totalSize = size;
  await download.save();
  emitUpdate(io, download);
}

async function expireCompletedDownloads(io) {
  const expired = await Download.find({
    status: "completed",
    expiresAt: { $lte: new Date() },
    storageReserved: true
  }).limit(100);
  for (const download of expired) {
    await fs.rm(resolveStoragePath(download.storagePath), { recursive: true, force: true });
    await releaseStorage(download);
    download.status = "expired";
    await download.save();
    emitUpdate(io, download);
  }
}

export async function startWorker(io) {
  await changeGlobalOptions({
    "max-overall-download-limit": formatAriaSpeed(MAX_GLOBAL_DOWNLOAD_SPEED),
    "bt-request-peer-speed-limit": formatAriaSpeed(ARIA2_BT_REQUEST_PEER_SPEED_LIMIT)
  });

  const worker = new Worker(
    "downloads",
    async (job) => {
      let download = await Download.findById(job.data.downloadId);
      if (!download || download.userId.toString() !== job.data.userId ||
          ["removed", "LIMIT_EXCEEDED", "expired"].includes(download.status)) {
        return;
      }

      const user = await User.findById(download.userId);
      if (!user) throw new Error("Download owner account no longer exists");
      const directory = resolveStoragePath(download.storagePath);
      await fs.mkdir(directory, { recursive: true });
      const aria2Directory = getAria2StoragePath(directory);
      const speedOption = {
        "max-download-limit": ariaSpeedOption(speedFor(download, user)),
        "bt-request-peer-speed-limit": formatAriaSpeed(ARIA2_BT_REQUEST_PEER_SPEED_LIMIT)
      };
      let gid;

      if (job.data.type === "torrent") {
        const metadataPath = path.join(directory, "input.torrent");
        const metadata = await fs.readFile(metadataPath);
        const parsedSize = getTorrentContentSize(metadata);
        download.totalSize = parsedSize;
        if (parsedSize > MAX_DOWNLOAD_SIZE) {
          await setLimitExceeded(download, io, undefined, parsedSize, 0);
          return;
        }
        if (!download.storageReserved && !(await reserveForDownload(download, parsedSize))) {
          await markQuotaExceeded(download, io, undefined, parsedSize);
          return;
        }

        download.status = "starting";
        download.maxDownloadSpeed = speedFor(download, user);
        await download.save();
        gid = await addTorrent(metadata.toString("base64"), {
          dir: aria2Directory,
          pause: "true",
          ...speedOption
        });
        download.gid = gid;
        await download.save();
        const initialStatus = await tellStatus(gid);
        const initialTotal = getStatusSize(initialStatus, "totalLength", "length");
        if (initialTotal > MAX_DOWNLOAD_SIZE) {
          await setLimitExceeded(download, io, gid, initialTotal, 0);
          return;
        }
        await fs.rm(metadataPath, { force: true });
        await resume(gid);
      } else {
        download.status = "starting";
        download.maxDownloadSpeed = speedFor(download, user);
        await download.save();
        gid = await addUri(job.data.uri, {
          dir: aria2Directory,
          pause: "true",
          ...speedOption
        });
        download.gid = gid;
        await download.save();

        let metadataStatus;
        const deadline = Date.now() + 120000;
        do {
          metadataStatus = await tellStatus(gid);
          const knownTotal = getStatusSize(metadataStatus, "totalLength", "length");
          if (knownTotal > MAX_DOWNLOAD_SIZE) {
            await setLimitExceeded(download, io, gid, knownTotal, 0);
            return;
          }
          if (knownTotal > 0) {
            if (!(await reserveForDownload(download, knownTotal))) {
              await markQuotaExceeded(download, io, gid, knownTotal);
              return;
            }
            download.totalSize = knownTotal;
            break;
          }
          await sleep(500);
        } while (Date.now() < deadline && !["error", "removed", "complete"].includes(metadataStatus.status));

        if (!download.storageReserved) {
          throw new Error("aria2 could not resolve magnet metadata before the timeout");
        }
        await resume(gid);
      }

      while (true) {
        const current = await Download.findById(download._id);
        if (!current || ["removed", "LIMIT_EXCEEDED", "expired"].includes(current.status)) return;
        download = current;

        const status = await tellStatus(gid);
        const totalSize = getStatusSize(status, "totalLength", "length");
        const completedSize = getStatusSize(status, "completedLength", "completedLength");
        if (totalSize > MAX_DOWNLOAD_SIZE || completedSize > MAX_DOWNLOAD_SIZE) {
          await setLimitExceeded(download, io, gid, totalSize, completedSize);
          return;
        }
        if (totalSize > download.reservedSize) {
          if (!(await reserveForDownload(download, totalSize))) {
            await markQuotaExceeded(download, io, gid, totalSize);
            return;
          }
          download.reservedSize = totalSize;
        }

        download.status = normalizeStatus(status.status);
        download.totalSize = totalSize;
        download.completedSize = completedSize;
        download.progress = totalSize
          ? Number(((completedSize / totalSize) * 100).toFixed(2))
          : 0;
        download.downloadSpeed = Number(status.downloadSpeed || 0);
        download.uploadSpeed = Number(status.uploadSpeed || 0);
        download.eta = download.downloadSpeed > 0 && totalSize > completedSize
          ? String(Math.ceil((totalSize - completedSize) / download.downloadSpeed))
          : undefined;
        download.files = mapAria2Files(status.files, aria2Directory);
        download.analysis = analyzeDownload(download);
        download.errorMessage = status.status === "error"
          ? "aria2 could not complete this download."
          : undefined;
        if (status.status === "complete") {
          download.completedAt = new Date();
          download.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        }
        await download.save();
        emitUpdate(io, download);

        if (["complete", "error", "removed"].includes(status.status)) return;
        await sleep(500);
      }
    },
    { connection }
  );

  worker.on("failed", async (job, error) => {
    console.error(`Download job failed: ${error.message}`);
    if (!job) return;
    const download = await Download.findOne({
      _id: job.data.downloadId,
      userId: job.data.userId,
      status: { $ne: "LIMIT_EXCEEDED" }
    });
    if (!download) return;
    if (download.gid) await cancel(download.gid);
    await fs.rm(resolveStoragePath(download.storagePath), { recursive: true, force: true });
    await releaseStorage(download);
    download.status = "error";
    download.errorMessage = error.message;
    await download.save();
    emitUpdate(io, download);
    io.to(room(download.userId.toString())).emit("download:error", {
      id: job.data.downloadId,
      error: error.message
    });
  });

  const expirationTimer = setInterval(() => {
    expireCompletedDownloads(io).catch((error) => {
      console.error(`Download expiration cleanup failed: ${error.message}`);
    });
  }, 60 * 1000);
  expirationTimer.unref();
  expireCompletedDownloads(io).catch((error) => {
    console.error(`Download expiration cleanup failed: ${error.message}`);
  });
  return worker;
}
