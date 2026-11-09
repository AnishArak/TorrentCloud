import bcrypt from "bcryptjs";
import express from "express";
import { rateLimit } from "express-rate-limit";
import { DEFAULT_MAX_DOWNLOAD_SPEED, DEFAULT_STORAGE_LIMIT } from "../config.js";
import { createAuthToken } from "../middleware/auth.js";
import Download from "../models/Download.js";
import User from "../models/User.js";

const router = express.Router();
const loginLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many login attempts. Try again later." }
});
const registerLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many registration attempts. Try again later." }
});

function publicUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    storageLimit: user.storageLimit,
    storageUsed: user.storageUsed,
    maxDownloadSpeed: user.maxDownloadSpeed
  };
}

router.post("/register", registerLimit, async (req, res) => {
  const { name, email, password, confirmPassword } = req.body || {};
  if (typeof name !== "string" || name.trim().length < 1 || name.trim().length > 80) {
    return res.status(400).json({ error: "Name must be between 1 and 80 characters." });
  }
  if (typeof email !== "string" || email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: "Enter a valid email address." });
  }
  if (typeof password !== "string" || password.length < 8 || password.length > 72) {
    return res.status(400).json({ error: "Password must be between 8 and 72 characters." });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ error: "Passwords do not match." });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail }).select("_id");
  if (existing) return res.status(409).json({ error: "An account with this email already exists." });

  const existingUserCount = await User.countDocuments();
  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash: await bcrypt.hash(password, 12),
    storageLimit: DEFAULT_STORAGE_LIMIT,
    storageUsed: 0,
    maxDownloadSpeed: DEFAULT_MAX_DOWNLOAD_SPEED
  });

  if (existingUserCount === 0) {
    const legacy = await Download.collection
      .find({ userId: "single-user" })
      .toArray();
    if (legacy.length) {
      await Download.collection.updateMany(
        { userId: "single-user" },
        { $set: { userId: user._id, reservedSize: 0, storageReserved: false } }
      );
      const keepStorage = legacy.filter(
        (download) => !["removed", "error", "LIMIT_EXCEEDED", "expired"].includes(download.status)
      );
      let storageUsed = 0;
      for (const download of keepStorage) {
        const reservedSize = Math.max(0, Number(download.totalSize || 0));
        if (reservedSize > 0) {
          await Download.collection.updateOne(
            { _id: download._id },
            { $set: { reservedSize, storageReserved: true } }
          );
          storageUsed += reservedSize;
        }
      }
      await User.updateOne({ _id: user._id }, { $set: { storageUsed } });
      user.storageUsed = storageUsed;
    }
  }

  return res.status(201).json({
    token: createAuthToken(user),
    user: publicUser(user)
  });
});

router.post("/login", loginLimit, async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }
  const user = await User.findOne({ email }).select("+passwordHash");
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: "Incorrect email or password." });
  }
  return res.json({
    token: createAuthToken(user),
    user: publicUser(user)
  });
});

export default router;
