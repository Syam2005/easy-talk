import Agenda from "agenda";
import ScheduledMessage from "../models/ScheduledMessage.js";
import Message, { buildConversationId } from "../models/Message.js";

let agenda;
let ioInstance;

export const initAgenda = async (mongoUri, io) => {
  ioInstance = io;
  agenda = new Agenda({ db: { address: mongoUri, collection: "agendaJobs" } });

  agenda.define("send-scheduled-message", async (job) => {
    const { scheduledMessageId } = job.attrs.data;
    const scheduled = await ScheduledMessage.findById(scheduledMessageId);
    if (!scheduled || scheduled.status !== "pending") return;

    try {
      const conversationId = buildConversationId(scheduled.sender, scheduled.receiver);
      const message = await Message.create({
        sender: scheduled.sender,
        receiver: scheduled.receiver,
        conversationId,
        text: scheduled.text,
        isScheduled: true,
      });

      scheduled.status = "sent";
      await scheduled.save();

      // Push it live over the socket if the receiver is connected
      const populated = await message.populate("sender", "username avatar");
      ioInstance.to(scheduled.receiver.toString()).emit("receiveMessage", populated);
      ioInstance.to(scheduled.sender.toString()).emit("scheduledMessageSent", populated);
    } catch (err) {
      scheduled.status = "failed";
      await scheduled.save();
      console.error("Failed to deliver scheduled message:", err.message);
    }
  });

  await agenda.start();
  console.log("✅ Agenda scheduler started (persistent, MongoDB-backed)");
};

export const scheduleMessageJob = async (scheduledMessageId, sendAt) => {
  const job = await agenda.schedule(sendAt, "send-scheduled-message", { scheduledMessageId });
  return job;
};

export const cancelMessageJob = async (scheduledMessageId) => {
  await agenda.cancel({ "data.scheduledMessageId": scheduledMessageId });
};
