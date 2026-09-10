import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // For direct messages
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    conversationId: { type: String, index: true },
    // For group messages
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group" },
    text: { type: String, default: "" },
    mediaUrl: { type: String, default: "" },
    mediaType: { type: String, enum: ["none", "image", "file", "audio"], default: "none" },
    fileName: { type: String, default: "" },
    status: { type: String, enum: ["sent", "delivered", "read"], default: "sent" },
    isScheduled: { type: Boolean, default: false },
    edited: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const buildConversationId = (userA, userB) => {
  return [userA.toString(), userB.toString()].sort().join("_");
};

export default mongoose.model("Message", messageSchema);
