import mongoose from "mongoose";

const learnMessageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["assistant", "user"], required: true },
    content: { type: String, required: true },
  },
  { timestamps: true, _id: false }
);

const learningNoteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    url: { type: String, default: "" },
    explanation: { type: String, required: true },
    // "geeksforgeeks" = built from a real scraped article; "ai-fallback" = the
    // article couldn't be fetched, so the model explained it from its own
    // training knowledge instead. Shown to the user so they know which they're reading.
    source: { type: String, enum: ["geeksforgeeks", "ai-fallback"], default: "geeksforgeeks" },
    // A trimmed excerpt of the original article, kept so follow-up chat
    // questions can stay grounded without re-fetching the page every time.
    articleExcerpt: { type: String, default: "" },
    // The initial explanation is stored as the first assistant message, then
    // follow-up questions/answers are appended as the user keeps chatting
    // about this specific topic.
    messages: { type: [learnMessageSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("LearningNote", learningNoteSchema);
