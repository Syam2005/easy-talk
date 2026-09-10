import express from "express";
import { protect } from "../middleware/auth.js";
import {
  createGroup,
  inviteToGroup,
  respondToGroupInvite,
  getMyGroupInvites,
  getMyGroups,
  getGroupMessages,
  leaveGroup,
} from "../controllers/groupController.js";

const router = express.Router();

router.get("/", protect, getMyGroups);
router.get("/invites", protect, getMyGroupInvites);
router.post("/invites/respond", protect, respondToGroupInvite);
router.post("/", protect, createGroup);
router.post("/:groupId/invite", protect, inviteToGroup);
router.get("/:groupId/messages", protect, getGroupMessages);
router.delete("/:groupId/leave", protect, leaveGroup);

export default router;
