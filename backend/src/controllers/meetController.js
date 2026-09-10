import User from "../models/User.js";
import Group from "../models/Group.js";
import { createMeetLink } from "../services/googleContactsService.js";

const isGoogleConfigured = () =>
  Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REDIRECT_URI &&
      process.env.GOOGLE_CLIENT_ID !== "your_google_client_id"
  );

// POST /api/meet/create  { peerId }  OR  { groupId }
// Creates a free Google Meet link (via the caller's own Google Calendar) and
// returns it. The frontend is responsible for sharing the link in the chat —
// this endpoint only knows how to mint the link itself.
export const createMeet = async (req, res) => {
  try {
    if (!isGoogleConfigured()) {
      return res.status(400).json({
        message: "Google Meet isn't set up on this server yet (missing GOOGLE_CLIENT_ID/SECRET in backend/.env).",
      });
    }

    const { peerId, groupId } = req.body;
    if (!peerId && !groupId) {
      return res.status(400).json({ message: "peerId or groupId is required" });
    }

    const me = await User.findById(req.userId);
    if (!me.googleRefreshToken) {
      return res.status(400).json({
        message: "Connect your Google account first to start Meet calls (People icon → Connect Google).",
        needsGoogleConnect: true,
      });
    }

    let summary = "Easy Talk call";
    if (groupId) {
      const group = await Group.findById(groupId);
      if (!group || !group.members.some((m) => m.toString() === req.userId)) {
        return res.status(403).json({ message: "You're not a member of this group" });
      }
      summary = `Easy Talk: ${group.name}`;
    } else if (peerId) {
      const peer = await User.findById(peerId);
      summary = `Easy Talk call with ${me.username}${peer ? ` & ${peer.username}` : ""}`;
    }

    let url;
    try {
      url = await createMeetLink(me.googleRefreshToken, summary);
    } catch (err) {
      const isAuthError = err.message?.includes("invalid_grant") || err.message?.includes("invalid_token");
      if (isAuthError) {
        await User.findByIdAndUpdate(req.userId, { googleRefreshToken: "" });
        return res.status(401).json({
          message: "Your Google connection expired or was revoked. Please connect your Google account again.",
          needsGoogleConnect: true,
        });
      }
      // Most common real cause: this account connected before the calendar
      // scope existed, so Google silently withholds calendar access.
      return res.status(400).json({
        message: "Couldn't create a Meet link. Try disconnecting and reconnecting your Google account (People icon → Google), then try again.",
        needsGoogleConnect: true,
        error: err.message,
      });
    }

    res.status(201).json({ url });
  } catch (err) {
    res.status(500).json({ message: "Failed to create Meet link", error: err.message });
  }
};
