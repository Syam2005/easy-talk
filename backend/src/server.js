import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import { Server } from "socket.io";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import { connectDB } from "./config/db.js";
import { initSocket } from "./sockets/socketHandler.js";
import { initAgenda } from "./services/agendaService.js";
import { ensureBotUser } from "./services/botService.js";
import { initWebPush } from "./services/pushService.js";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import summaryRoutes from "./routes/summaryRoutes.js";
import friendRoutes from "./routes/friendRoutes.js";
import groupRoutes from "./routes/groupRoutes.js";
import googleRoutes from "./routes/googleRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import pushRoutes from "./routes/pushRoutes.js";
import meetRoutes from "./routes/meetRoutes.js";
import learnRoutes from "./routes/learnRoutes.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
// Supports multiple origins (comma-separated) for cases like testing from a phone
// on the same network, or running frontend on a different port during development.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || CLIENT_URL)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, server-to-server, some mobile webviews)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS. Add it to ALLOWED_ORIGINS in backend/.env`));
    }
  },
  credentials: true,
};

const io = new Server(server, { cors: corsOptions });

app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(path.join(__dirname, "..", process.env.UPLOAD_DIR || "uploads")));

// Makes io available in REST controllers (req.io.emit / req.io.to(...))
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/summary", summaryRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/google", googleRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/push", pushRoutes);
app.use("/api/meet", meetRoutes);
app.use("/api/learn", learnRoutes);

// Serve the built frontend from this same server/port. This is the key
// simplification: instead of running frontend and backend as two separate
// servers on two ports (which needs CORS config, a hardcoded API URL baked
// into the frontend build, and two tunnels when testing on a phone), the
// browser now loads everything — HTML, JS, API, sockets — from one origin.
// Relative fetch('/api/...') calls automatically go to the right place no
// matter what host/IP/tunnel URL the page was opened from.
const frontendDist = path.join(__dirname, "..", "..", "frontend", "dist");
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) return next();
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

app.get("/api/health", (req, res) => res.json({ status: "ok", time: new Date() }));

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  initWebPush();
  const botId = await ensureBotUser();
  initSocket(io, botId);
  await initAgenda(process.env.MONGO_URI || "mongodb://localhost:27017/easytalk", io);

  server.listen(PORT, () => {
    console.log(`🚀 Easy Talk backend running on http://localhost:${PORT}`);
    if (fs.existsSync(frontendDist)) {
      console.log(`📱 Frontend is served from this SAME server — open http://localhost:${PORT} (or your LAN IP / tunnel URL) for everything, on one port.`);
    } else {
      console.log(`ℹ️  No frontend build found at ${frontendDist} — run "npm run build" in frontend/ to serve it from here too, or keep running the Vite dev server separately.`);
    }
  });
};

start();
