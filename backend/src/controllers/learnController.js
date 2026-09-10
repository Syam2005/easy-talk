import { searchGeeksForGeeks, fetchArticleText } from "../services/learnService.js";
import { explainConcept, learnFollowUp } from "../services/ollamaService.js";
import LearningNote from "../models/LearningNote.js";

// GET /api/learn/search?q=recursion
export const searchConcepts = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.status(400).json({ message: "A search term is required" });

    const results = await searchGeeksForGeeks(q);
    res.json({ results });
  } catch (err) {
    res.status(500).json({
      message: "Search failed — GeeksforGeeks or the search provider might be temporarily unreachable.",
      error: err.message,
    });
  }
};

// POST /api/learn/explain  { url, title }
// Fetches the chosen article and asks the local AI to turn it into a clear
// explanation. If the article can't be fetched/parsed, falls back to letting
// the AI explain the concept from its own knowledge instead of failing outright.
export const explainArticle = async (req, res) => {
  try {
    const { url, title } = req.body;
    const topic = (title || "").trim() || url;
    if (!topic) return res.status(400).json({ message: "A url or title is required" });

    let explanation;
    let source;
    let articleExcerpt = "";
    try {
      const articleText = await fetchArticleText(url);
      articleExcerpt = articleText.slice(0, 4000);
      explanation = await explainConcept(topic, articleText);
      source = "geeksforgeeks";
    } catch (scrapeErr) {
      explanation = await explainConcept(topic, null);
      source = "ai-fallback";
    }

    const note = await LearningNote.create({
      user: req.userId,
      title: topic,
      url: url || "",
      explanation,
      source,
      articleExcerpt,
      messages: [{ role: "assistant", content: explanation }],
    });

    res.status(201).json({ explanation, source, note });
  } catch (err) {
    res.status(500).json({
      message: "Couldn't generate an explanation. Is Ollama running?",
      error: err.message,
    });
  }
};

// POST /api/learn/notes/:id/chat  { message }
// Lets the student keep asking questions about a topic they already got an
// explanation for — same idea as the assistant bot, but grounded in this
// specific topic/article instead of being a general-purpose chat.
export const chatAboutNote = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: "A message is required" });
    }

    const note = await LearningNote.findOne({ _id: req.params.id, user: req.userId });
    if (!note) return res.status(404).json({ message: "Note not found" });

    const reply = await learnFollowUp(
      note.title,
      note.articleExcerpt,
      note.messages.map((m) => ({ role: m.role, content: m.content })),
      message.trim()
    );

    note.messages.push({ role: "user", content: message.trim() });
    note.messages.push({ role: "assistant", content: reply });
    await note.save();

    res.json({ messages: note.messages });
  } catch (err) {
    res.status(500).json({
      message: "Couldn't get a reply. Is Ollama running?",
      error: err.message,
    });
  }
};

// GET /api/learn/notes — saved explanations, most recent first
export const getMyNotes = async (req, res) => {
  try {
    const notes = await LearningNote.find({ user: req.userId }).sort({ createdAt: -1 }).limit(50);
    res.json(notes);
  } catch (err) {
    res.status(500).json({ message: "Failed to load saved notes", error: err.message });
  }
};

// DELETE /api/learn/notes/:id
export const deleteNote = async (req, res) => {
  try {
    await LearningNote.deleteOne({ _id: req.params.id, user: req.userId });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete note", error: err.message });
  }
};
