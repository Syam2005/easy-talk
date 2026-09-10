import express from "express";
import { protect } from "../middleware/auth.js";
import { summarizeConversation, summarizeGroup } from "../controllers/summaryController.js";

const router = express.Router();

router.get("/group/:groupId", protect, summarizeGroup);
router.get("/:otherUserId", protect, summarizeConversation);

export default router;
