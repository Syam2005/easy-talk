import express from "express";
import { protect } from "../middleware/auth.js";
import PushSubscription from "../models/PushSubscription.js";
import { isPushConfigured } from "../services/pushService.js";

const router = express.Router();

// GET /api/push/public-key -> the frontend needs this to call PushManager.subscribe()
router.get("/public-key", (req, res) => {
  res.json({
    publicKey: process.env.VAPID_PUBLIC_KEY || null,
    configured: isPushConfigured(),
  });
});

// POST /api/push/subscribe -> save this device's push subscription
router.post("/subscribe", protect, async (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ message: "Invalid subscription" });
    }

    await PushSubscription.findOneAndUpdate(
      { endpoint },
      { user: req.userId, endpoint, keys },
      { upsert: true }
    );
    res.status(201).json({ message: "Subscribed" });
  } catch (err) {
    res.status(500).json({ message: "Failed to save subscription", error: err.message });
  }
});

// POST /api/push/unsubscribe -> remove this device's push subscription
router.post("/unsubscribe", protect, async (req, res) => {
  const { endpoint } = req.body;
  if (endpoint) await PushSubscription.deleteOne({ endpoint, user: req.userId });
  res.json({ message: "Unsubscribed" });
});

export default router;
