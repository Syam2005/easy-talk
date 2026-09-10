import Message, { buildConversationId } from "../models/Message.js";
import ScheduledMessage from "../models/ScheduledMessage.js";
import { scheduleMessageJob, cancelMessageJob } from "../services/agendaService.js";

// GET /api/messages/:otherUserId  -> conversation history
export const getConversation = async (req, res) => {
  try {
    const conversationId = buildConversationId(req.userId, req.params.otherUserId);
    const messages = await Message.find({ conversationId })
      .sort({ createdAt: 1 })
      .limit(500);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch conversation", error: err.message });
  }
};

// POST /api/messages  -> send immediate message (also used as fallback to socket)
export const sendMessage = async (req, res) => {
  try {
    const { receiver, text, mediaUrl, mediaType } = req.body;
    const conversationId = buildConversationId(req.userId, receiver);

    const message = await Message.create({
      sender: req.userId,
      receiver,
      conversationId,
      text,
      mediaUrl,
      mediaType: mediaType || "none",
    });

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ message: "Failed to send message", error: err.message });
  }
};

// POST /api/messages/schedule -> schedule a message for later
export const scheduleMessage = async (req, res) => {
  try {
    const { receiver, text, sendAt } = req.body;
    if (!receiver || !text || !sendAt) {
      return res.status(400).json({ message: "receiver, text and sendAt are required" });
    }

    const sendDate = new Date(sendAt);
    if (sendDate.getTime() <= Date.now()) {
      return res.status(400).json({ message: "sendAt must be in the future" });
    }

    const scheduled = await ScheduledMessage.create({
      sender: req.userId,
      receiver,
      text,
      sendAt: sendDate,
    });

    await scheduleMessageJob(scheduled._id, sendDate);

    res.status(201).json(scheduled);
  } catch (err) {
    res.status(500).json({ message: "Failed to schedule message", error: err.message });
  }
};

// GET /api/messages/scheduled/all -> list my pending scheduled messages
export const getMyScheduledMessages = async (req, res) => {
  try {
    const scheduled = await ScheduledMessage.find({
      sender: req.userId,
      status: "pending",
    }).sort({ sendAt: 1 });
    res.json(scheduled);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch scheduled messages", error: err.message });
  }
};

// DELETE /api/messages/scheduled/:id -> cancel a scheduled message
export const cancelScheduledMessage = async (req, res) => {
  try {
    const scheduled = await ScheduledMessage.findOne({
      _id: req.params.id,
      sender: req.userId,
    });
    if (!scheduled) return res.status(404).json({ message: "Scheduled message not found" });

    scheduled.status = "cancelled";
    await scheduled.save();
    await cancelMessageJob(scheduled._id);

    res.json({ message: "Scheduled message cancelled" });
  } catch (err) {
    res.status(500).json({ message: "Failed to cancel scheduled message", error: err.message });
  }
};
