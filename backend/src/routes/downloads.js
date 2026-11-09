import express from "express";
import fs from "fs/promises";
import Download from "../models/Download.js";
import { pause, resume, cancel } from "../services/aria2.js";
import { resolveDownloadFile, resolveStoragePath } from "../services/storage.js";
import { releaseStorage } from "../services/quota.js";
import { serializeDownload } from "../services/downloadView.js";

const router = express.Router();

router.post("/:id/pause", async (req, res) => {
  const download = await Download.findOne({ _id: req.params.id, userId: req.user._id });
  if (!download?.gid) return res.status(404).json({ error: "Not found" });
  await pause(download.gid);
  download.status = "paused";
  await download.save();
  return res.json(serializeDownload(download));
});

router.post("/:id/resume", async (req, res) => {
  const download = await Download.findOne({ _id: req.params.id, userId: req.user._id });
  if (!download?.gid) return res.status(404).json({ error: "Not found" });
  await resume(download.gid);
  download.status = "downloading";
  await download.save();
  return res.json(serializeDownload(download));
});

router.delete("/:id", async (req, res) => {
  const download = await Download.findOne({ _id: req.params.id, userId: req.user._id });
  if (!download) return res.status(404).json({ error: "Not found" });
  if (download.gid && !["completed", "removed", "LIMIT_EXCEEDED", "expired"].includes(download.status)) {
    await cancel(download.gid);
  }
  await fs.rm(resolveStoragePath(download.storagePath), { recursive: true, force: true });
  await releaseStorage(download);
  download.status = "removed";
  await download.save();
  return res.json({ ok: true });
});

router.get("/file/:token", async (req, res) => {
  const download = await Download.findOne({
    downloadToken: req.params.token,
    userId: req.user._id,
    status: "completed"
  });
  if (!download) return res.status(404).send("Link unavailable or expired");
  if (download.expiresAt && download.expiresAt < new Date()) {
    return res.status(410).send("Link expired");
  }

  const firstFile = download.files?.find((file) => file.path);
  try {
    const root = resolveStoragePath(download.storagePath);
    const filePath = firstFile
      ? await resolveDownloadFile(root, firstFile.path)
      : await fs.realpath(root);
    if (!firstFile && !(await fs.stat(filePath)).isFile()) {
      return res.status(404).send("File missing");
    }
    return res.download(filePath);
  } catch (error) {
    if (error.code === "ENOENT") return res.status(404).send("File missing");
    throw error;
  }
});

export default router;
