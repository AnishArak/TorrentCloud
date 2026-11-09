import crypto from "crypto";
import express from "express";
import { rateLimit } from "express-rate-limit";
import fs from "fs/promises";
import multer from "multer";
import path from "path";
import {
  formatBytes,
  MAX_DOWNLOAD_SIZE,
  MAX_TORRENT_FILE_SIZE
} from "../config.js";
import { createStoragePath } from "../services/storage.js";
import { getTorrentContentSize } from "../services/torrentMetadata.js";
import Download from "../models/Download.js";
import { downloadQueue } from "../queue/queue.js";
import { reserveStorage, rollbackStorage } from "../services/quota.js";
import { serializeDownload } from "../services/downloadView.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_TORRENT_FILE_SIZE, files: 1, fields: 10 }
});
const createDownloadLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many download requests. Try again later." }
});

router.post("/upload", createDownloadLimit, upload.single("torrent"), async (req, res) => {
  if (!req.file || !req.file.originalname.toLowerCase().endsWith(".torrent")) {
    return res.status(400).json({ error: "Upload a valid .torrent file" });
  }

  let totalSize;
  try {
    totalSize = getTorrentContentSize(req.file.buffer);
  } catch (error) {
    return res.status(400).json({ error: `Invalid torrent metadata: ${error.message}` });
  }
  if (totalSize > MAX_DOWNLOAD_SIZE) {
    return res.status(413).json({
      status: "LIMIT_EXCEEDED",
      error: `This torrent contains more than the allowed ${formatBytes(MAX_DOWNLOAD_SIZE)}.`
    });
  }

  const userId = req.user._id;
  const reserved = await reserveStorage(userId, totalSize);
  if (!reserved) {
    return res.status(413).json({
      error: "This download exceeds your remaining storage quota."
    });
  }

  const storagePath = createStoragePath();
  try {
    await fs.mkdir(storagePath, { recursive: true });
    await fs.writeFile(path.join(storagePath, "input.torrent"), req.file.buffer, { flag: "wx" });
    const download = await Download.create({
      userId,
      name: req.body.name || req.file.originalname,
      status: "queued",
      totalSize,
      reservedSize: totalSize,
      storageReserved: totalSize > 0,
      maxDownloadSpeed: req.user.maxDownloadSpeed,
      storagePath,
      downloadToken: crypto.randomBytes(24).toString("hex")
    });
    await downloadQueue.add("torrent", {
      downloadId: download._id.toString(),
      userId: userId.toString(),
      type: "torrent"
    });
    return res.status(201).json(serializeDownload(download));
  } catch (error) {
    await fs.rm(storagePath, { recursive: true, force: true });
    await rollbackStorage(userId, totalSize);
    throw error;
  }
});

router.post("/magnet", createDownloadLimit, async (req, res) => {
  const uri = String(req.body?.magnet || "");
  if (!uri.startsWith("magnet:?")) {
    return res.status(400).json({ error: "Invalid magnet URI" });
  }

  const download = await Download.create({
    userId: req.user._id,
    name: "Magnet download",
    status: "queued",
    maxDownloadSpeed: req.user.maxDownloadSpeed,
    storagePath: createStoragePath(),
    downloadToken: crypto.randomBytes(24).toString("hex")
  });
  await downloadQueue.add("magnet", {
    downloadId: download._id.toString(),
    userId: req.user._id.toString(),
    type: "magnet",
    uri
  });
  return res.status(201).json(serializeDownload(download));
});

router.get("/history", async (req, res) => {
  const downloads = await Download.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(200);
  return res.json(downloads.map(serializeDownload));
});

router.get("/files", async (req, res) => {
  const downloads = await Download.find({ userId: req.user._id, status: "completed" })
    .sort({ completedAt: -1 })
    .limit(200);
  return res.json(downloads.map(serializeDownload));
});

router.get("/", async (req, res) => {
  const downloads = await Download.find({ userId: req.user.id })
    .sort({ createdAt: -1 })
    .limit(50);
  return res.json(downloads.map(serializeDownload));
});

router.get("/:id/analyze", async (req, res) => {
  const download = await Download.findOne({ _id: req.params.id, userId: req.user._id });
  if (!download) return res.status(404).json({ error: "Not found" });
  const { analyzeDownload } = await import("../services/analyzer.js");
  return res.json(analyzeDownload(download));
});

router.get("/:id", async (req, res) => {
  const download = await Download.findOne({ _id: req.params.id, userId: req.user.id });
  if (!download) return res.status(404).json({ error: "Not found" });
  return res.json(serializeDownload(download));
});

export default router;
