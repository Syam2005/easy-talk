import mongoose from "mongoose";

const scheduledMessageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true },
    sendAt: { type: Date, required: true },
    status: { type: String, enum: ["pending", "sent", "cancelled", "failed"], default: "pending" },
  },
  { timestamps: true }
);

export default mongoose.model("ScheduledMessage", scheduledMessageSchema);
