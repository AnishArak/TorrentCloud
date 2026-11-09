import express from "express";
import {
  ALLOW_UNLIMITED_DOWNLOAD_SPEED,
  DEFAULT_STORAGE_LIMIT,
  MAX_ALLOWED_DOWNLOAD_SPEED
} from "../config.js";
import Download from "../models/Download.js";
import { changeOptions } from "../services/aria2.js";
import { ariaSpeedOption, resolveSpeedLimit } from "../services/speedLimits.js";

const router = express.Router();
const ACTIVE_STATUSES = ["starting", "downloading", "paused"];

function userView(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    storageLimit: user.storageLimit || DEFAULT_STORAGE_LIMIT,
    storageUsed: user.storageUsed || 0,
    maxDownloadSpeed: user.maxDownloadSpeed,
    maxAllowedDownloadSpeed: MAX_ALLOWED_DOWNLOAD_SPEED,
    allowUnlimitedDownloadSpeed: ALLOW_UNLIMITED_DOWNLOAD_SPEED
  };
}

router.get("/me", async (req, res) => {
  const [activeDownloads, completedDownloads] = await Promise.all([
    Download.countDocuments({ userId: req.user._id, status: { $in: ACTIVE_STATUSES } }),
    Download.countDocuments({ userId: req.user._id, status: "completed" })
  ]);
  return res.json({
    user: userView(req.user),
    stats: { activeDownloads, completedDownloads }
  });
});

router.patch("/me/speed", async (req, res) => {
  let speed;
  try {
    speed = resolveSpeedLimit(req.body?.speedLimit);
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }

  const activeDownloads = await Download.find({
    userId: req.user._id,
    status: { $in: ACTIVE_STATUSES },
    gid: { $exists: true, $ne: "" }
  });
  const option = { "max-download-limit": ariaSpeedOption(speed) };
  const outcomes = await Promise.allSettled(
    activeDownloads.map(async (download) => {
      await changeOptions(download.gid, option);
      download.maxDownloadSpeed = speed;
      await download.save();
    })
  );

  req.user.maxDownloadSpeed = speed;
  await req.user.save();
  await Download.updateMany(
    { userId: req.user._id, status: { $in: ["queued", "starting"] }, gid: { $exists: false } },
    { $set: { maxDownloadSpeed: speed } }
  );
  const failedUpdates = outcomes.filter((outcome) => outcome.status === "rejected");
  if (failedUpdates.length) {
    return res.status(502).json({
      error: `Saved your preference, but aria2 could not update ${failedUpdates.length} active download(s).`
    });
  }
  return res.json({ user: userView(req.user) });
});

export default router;
