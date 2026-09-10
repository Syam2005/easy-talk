import Message, { buildConversationId } from "../models/Message.js";
import Group from "../models/Group.js";
import { summarizeText } from "../services/ollamaService.js";

const buildSummary = async (res, messages) => {
  if (messages.length === 0) {
    return res.json({ summary: "No messages to summarize yet." });
  }
  const conversationText = messages
    .reverse()
    .map((m) => `${m.sender.username}: ${m.text}`)
    .join("\n");
  const summary = await summarizeText(conversationText);
  res.json({ summary, messageCount: messages.length });
};

// GET /api/summary/:otherUserId?limit=50
export const summarizeConversation = async (req, res) => {
  try {
    const conversationId = buildConversationId(req.userId, req.params.otherUserId);
    const limit = parseInt(req.query.limit) || 50;

    const messages = await Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("sender", "username");

    await buildSummary(res, messages);
  } catch (err) {
    res.status(500).json({
      message: "Failed to summarize conversation. Is Ollama running?",
      error: err.message,
    });
  }
};

// GET /api/summary/group/:groupId?limit=50
export const summarizeGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId);
    if (!group || !group.members.some((m) => m.toString() === req.userId)) {
      return res.status(403).json({ message: "You're not a member of this group" });
    }

    const limit = parseInt(req.query.limit) || 50;
    const messages = await Message.find({ group: groupId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("sender", "username");

    await buildSummary(res, messages);
  } catch (err) {
    res.status(500).json({
      message: "Failed to summarize group conversation. Is Ollama running?",
      error: err.message,
    });
  }
};
