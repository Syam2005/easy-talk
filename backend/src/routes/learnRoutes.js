import express from "express";
import { protect } from "../middleware/auth.js";
import {
  searchConcepts,
  explainArticle,
  getMyNotes,
  deleteNote,
  chatAboutNote,
} from "../controllers/learnController.js";

const router = express.Router();

router.get("/search", protect, searchConcepts);
router.post("/explain", protect, explainArticle);
router.get("/notes", protect, getMyNotes);
router.post("/notes/:id/chat", protect, chatAboutNote);
router.delete("/notes/:id", protect, deleteNote);

export default router;
