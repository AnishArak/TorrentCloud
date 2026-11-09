import "dotenv/config";
import cors from "cors";
import express from "express";
import http from "http";
import mongoose from "mongoose";
import { Server } from "socket.io";
import authRouter from "./routes/auth.js";
import downloadsRouter from "./routes/downloads.js";
import torrentsRouter from "./routes/torrents.js";
import usersRouter from "./routes/users.js";
import { requireAuth, getAuthenticatedUser } from "./middleware/auth.js";
import { startWorker } from "./queue/queue.js";
import { formatBytes, MAX_TORRENT_FILE_SIZE } from "./config.js";

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 4000;

const io = new Server(server, {
  cors: {
    origin: process.env.WEB_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

io.use((socket, next) => {
  try {
    socket.data.user = getAuthenticatedUser(socket.handshake.auth?.token);
    next();
  } catch {
    next(new Error("Authentication required"));
  }
});

app.use(
  cors({
    origin: process.env.WEB_URL || "http://localhost:3000"
  })
);

app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (req, res) => {
  const mongoConnected = mongoose.connection.readyState === 1;
  return res.status(mongoConnected ? 200 : 503).json({
    status: mongoConnected ? "ok" : "degraded",
    message: mongoConnected
      ? "TorrentCloud API is running"
      : "MongoDB is unavailable. Start Docker Desktop and run docker compose up -d from the project root.",
    dependencies: { mongodb: mongoConnected ? "connected" : "disconnected" }
  });
});

app.use("/api/auth", authRouter);
const requireDatabase = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      error: "MongoDB is unavailable. Start Docker Desktop and run docker compose up -d from the project root."
    });
  }
  return next();
};

app.use("/api/users", requireDatabase, requireAuth, usersRouter);
app.use("/api/torrents", requireDatabase, requireAuth, torrentsRouter);
app.use("/api/downloads", requireDatabase, requireAuth, downloadsRouter);

app.use((error, req, res, next) => {
  if (error.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      error: `Torrent metadata file exceeds the ${formatBytes(MAX_TORRENT_FILE_SIZE)} upload limit.`
    });
  }
  if (error.code === 11000) {
    return res.status(409).json({ error: "An account with this email already exists." });
  }
  if (res.headersSent) return next(error);
  console.error(error);
  return res.status(error.status || 500).json({
    error: error.status ? error.message : "The request could not be completed."
  });
});

io.on("connection", (socket) => {
  socket.join(`user:${socket.data.user.id}`);
  console.log(`Socket connected: ${socket.id}`);

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 TorrentCloud API running on http://localhost:${PORT}`);
  mongoose
    .connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/torrentcloud")
    .then(async () => {
      await startWorker(io);
      console.log("MongoDB connected; download worker started");
    })
    .catch((error) => {
      console.error(`Backend services could not start: ${error.message}`);
    });
});