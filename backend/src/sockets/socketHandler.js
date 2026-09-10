import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Group from "../models/Group.js";
import Message, { buildConversationId } from "../models/Message.js";
import { chatReply } from "../services/ollamaService.js";
import { sendPushToUser } from "../services/pushService.js";

// Track userId -> socketId for direct delivery
const onlineUsers = new Map();

export const initSocket = (io, botId) => {
  // Authenticate socket connections using the same JWT as REST
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("No token provided"));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", async (socket) => {
    const { userId } = socket;
    onlineUsers.set(userId, socket.id);
    socket.join(userId); // room named after userId for easy targeted emits

    await User.findByIdAndUpdate(userId, { isOnline: true });
    io.emit("userStatusChanged", { userId, isOnline: true });

    // --- Direct messaging ---
    socket.on("sendMessage", async ({ receiver, text, mediaUrl, mediaType, fileName, replyLanguage }) => {
      try {
        const conversationId = buildConversationId(userId, receiver);
        const message = await Message.create({
          sender: userId,
          receiver,
          conversationId,
          text,
          mediaUrl,
          mediaType: mediaType || "none",
          fileName,
        });
        const populated = await message.populate("sender", "username avatar isBot");

        io.to(receiver).emit("receiveMessage", populated);
        io.to(userId).emit("messageSentAck", populated);

        // Only push if they're not actively connected — no point notifying
        // someone who already just saw it appear live in their open chat.
        if (!onlineUsers.has(receiver)) {
          sendPushToUser(receiver, {
            title: populated.sender?.username || "New message",
            body: mediaType && mediaType !== "none" ? `Sent ${mediaType === "audio" ? "a voice message" : "an attachment"}` : text,
            url: "/",
          }).catch(() => {});
        }

        // If messaging the built-in assistant, generate and deliver a reply.
        // Runs for voice messages too — if the browser didn't attach a
        // transcript (see MessageInput.jsx), the bot still replies, just
        // asking for text instead of silently doing nothing.
        if (botId && receiver === botId && (text || mediaType === "audio")) {
          try {
            const recentHistory = await Message.find({ conversationId })
              .sort({ createdAt: -1 })
              .limit(10);
            const historyForPrompt = recentHistory
              .reverse()
              .map((m) => ({ text: m.text, fromBot: m.sender.toString() === botId }));

            const replyText = text
              ? await chatReply(text, historyForPrompt, replyLanguage)
              : "I got your voice message, but I couldn't make out a transcript for it (speech-to-text isn't available in every browser — it works best in Chrome). Could you try again, or just type it out?";
            const botMessage = await Message.create({
              sender: botId,
              receiver: userId,
              conversationId,
              text: replyText,
            });
            const populatedBotMsg = await botMessage.populate("sender", "username avatar isBot");
            io.to(userId).emit("receiveMessage", populatedBotMsg);
          } catch (err) {
            io.to(userId).emit("errorMessage", {
              message: "Easy Talk Assistant is unavailable. Is Ollama running?",
              error: err.message,
            });
          }
        }
      } catch (err) {
        socket.emit("errorMessage", { message: "Failed to send message", error: err.message });
      }
    });

    // --- Editing a message you sent ---
    socket.on("editMessage", async ({ messageId, text }) => {
      try {
        if (!text || !text.trim()) {
          return socket.emit("errorMessage", { message: "Message text can't be empty" });
        }
        const message = await Message.findById(messageId);
        if (!message) return socket.emit("errorMessage", { message: "Message not found" });
        if (message.sender.toString() !== userId) {
          return socket.emit("errorMessage", { message: "You can only edit your own messages" });
        }

        message.text = text.trim();
        message.edited = true;
        await message.save();
        const populated = await message.populate("sender", "username avatar isBot");

        if (message.group) {
          io.to(`group:${message.group}`).emit("messageEdited", populated);
        } else {
          // Direct message — update it on both ends
          io.to(message.sender.toString()).emit("messageEdited", populated);
          if (message.receiver) io.to(message.receiver.toString()).emit("messageEdited", populated);
        }
      } catch (err) {
        socket.emit("errorMessage", { message: "Failed to edit message", error: err.message });
      }
    });

    // --- Typing indicators ---
    socket.on("typing", ({ receiver }) => {
      io.to(receiver).emit("userTyping", { userId });
    });

    socket.on("stopTyping", ({ receiver }) => {
      io.to(receiver).emit("userStoppedTyping", { userId });
    });

    // --- Read receipts ---
    socket.on("markAsRead", async ({ conversationId, receiver }) => {
      await Message.updateMany(
        { conversationId, receiver: userId, status: { $ne: "read" } },
        { status: "read" }
      );
      io.to(receiver).emit("messagesRead", { conversationId, readBy: userId });
    });

    // --- Group messaging ---
    socket.on("joinGroupRooms", (groupIds = []) => {
      groupIds.forEach((gid) => socket.join(`group:${gid}`));
    });

    socket.on("leaveGroupRoom", ({ groupId }) => {
      socket.leave(`group:${groupId}`);
    });

    socket.on("sendGroupMessage", async ({ groupId, text, mediaUrl, mediaType, fileName }) => {
      try {
        const group = await Group.findById(groupId);
        if (!group || !group.members.some((m) => m.toString() === userId)) {
          return socket.emit("errorMessage", { message: "You're not a member of this group" });
        }

        const message = await Message.create({
          sender: userId,
          group: groupId,
          text,
          mediaUrl,
          mediaType: mediaType || "none",
          fileName,
        });
        const populated = await message.populate("sender", "username avatar");
        io.to(`group:${groupId}`).emit("receiveGroupMessage", populated);

        // Notify offline members too — everyone in the group except the sender
        group.members
          .map((m) => m.toString())
          .filter((memberId) => memberId !== userId && !onlineUsers.has(memberId))
          .forEach((memberId) => {
            sendPushToUser(memberId, {
              title: `${populated.sender?.username || "Someone"} in ${group.name}`,
              body: mediaType && mediaType !== "none" ? "Sent an attachment" : text,
              url: "/",
            }).catch(() => {});
          });
      } catch (err) {
        socket.emit("errorMessage", { message: "Failed to send group message", error: err.message });
      }
    });

    // --- Disconnect / presence ---
    socket.on("disconnect", async () => {
      onlineUsers.delete(userId);
      await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
      io.emit("userStatusChanged", { userId, isOnline: false, lastSeen: new Date() });
    });
  });
};
