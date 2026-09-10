import express from "express";
import { protect } from "../middleware/auth.js";
import {
  sendFriendRequest,
  respondToFriendRequest,
  getIncomingRequests,
  getFriends,
  searchUsers,
} from "../controllers/friendController.js";

const router = express.Router();

router.get("/", protect, getFriends);
router.get("/search", protect, searchUsers);
router.get("/requests", protect, getIncomingRequests);
router.post("/request", protect, sendFriendRequest);
router.post("/respond", protect, respondToFriendRequest);

export default router;
