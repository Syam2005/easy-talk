import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { protect } from "../middleware/auth.js";

// Local disk storage: free, zero setup, fine for personal/small-team use.
// Swap this for MinIO later if you need multi-server deployment or S3-style scaling.
const uploadDir = path.join(process.cwd(), process.env.UPLOAD_DIR || "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || "";
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB cap, adjust as needed
});

const router = express.Router();

// POST /api/upload  (multipart/form-data, field name "file")
// Used for voice messages now; also works for images/files generically.
router.post("/", protect, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  res.status(201).json({
    url: `/uploads/${req.file.filename}`,
    filename: req.file.filename,
    mimetype: req.file.mimetype,
  });
});

export default router;
