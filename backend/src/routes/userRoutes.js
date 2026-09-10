import express from "express";
import { protect } from "../middleware/auth.js";
import User from "../models/User.js";

const router = express.Router();

// List all users except the logged-in one (basic contact list)
router.get("/", protect, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.userId } }).select(
      "username email avatar isOnline lastSeen"
    );
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch users", error: err.message });
  }
});

export default router;
