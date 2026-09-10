import express from "express";
import { protect } from "../middleware/auth.js";
import {
  getConversation,
  sendMessage,
  scheduleMessage,
  getMyScheduledMessages,
  cancelScheduledMessage,
} from "../controllers/messageController.js";

const router = express.Router();

router.get("/scheduled/all", protect, getMyScheduledMessages);
router.delete("/scheduled/:id", protect, cancelScheduledMessage);
router.post("/schedule", protect, scheduleMessage);

router.get("/:otherUserId", protect, getConversation);
router.post("/", protect, sendMessage);

export default router;
