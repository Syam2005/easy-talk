import express from "express";
import { protect } from "../middleware/auth.js";
import {
  getGoogleAuthUrl,
  googleCallback,
  getGoogleStatus,
  getMatchedContacts,
  disconnectGoogle,
} from "../controllers/googleController.js";

const router = express.Router();

router.get("/auth-url", protect, getGoogleAuthUrl);
router.get("/callback", googleCallback); // Google redirects here directly, no JWT header
router.get("/status", protect, getGoogleStatus);
router.get("/matched-contacts", protect, getMatchedContacts);
router.post("/disconnect", protect, disconnectGoogle);

export default router;
