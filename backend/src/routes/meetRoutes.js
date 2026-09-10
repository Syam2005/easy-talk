import express from "express";
import { protect } from "../middleware/auth.js";
import { createMeet } from "../controllers/meetController.js";

const router = express.Router();

router.post("/create", protect, createMeet);

export default router;
