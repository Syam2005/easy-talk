// Talks to a locally running Ollama server (https://ollama.com).
// No API key, no per-request cost, no daily quota — it just uses your machine's CPU/GPU.
// Install once: `ollama pull llama3.1:8b` (or a smaller model like `phi3` for lighter hardware).

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.1:8b";

const callOllama = async (prompt) => {
  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Ollama request failed: ${errText}`);
  }

  const data = await response.json();
  return data.response?.trim() || "";
};

export const summarizeText = async (conversationText) => {
  const prompt = `You are a helpful assistant that summarizes chat conversations.
Summarize the following conversation in 3-5 concise bullet points, capturing key
decisions, action items, and topics discussed. Do not add commentary outside the summary.

Conversation:
${conversationText}

Summary:`;

  const result = await callOllama(prompt);
  return result || "No summary generated.";
};

// Used by the in-chat "Easy Talk Assistant" bot contact.
export const chatReply = async (userMessage, history = [], replyLanguage = null) => {
  const historyText = history
    .map((h) => `${h.fromBot ? "Assistant" : "User"}: ${h.text}`)
    .join("\n");

  const languageInstruction = replyLanguage
    ? `Reply in ${replyLanguage}, regardless of what language this prompt is written in.`
    : `Reply in the same language the user's message is written in.`;

  const prompt = `You are "Easy Talk Assistant", a friendly, concise helper built into a chat app.
Answer the user's question or help with their request directly and conversationally.
Keep replies short unless the question genuinely needs more detail.
${languageInstruction}

${historyText ? historyText + "\n" : ""}User: ${userMessage}
Assistant:`;

  const result = await callOllama(prompt);
  return result || "Sorry, I couldn't come up with a reply just now.";
};

// Used by the Learning page to turn a scraped article (or, as a fallback,
// the model's own knowledge) into a clear, structured explanation.
export const explainConcept = async (title, referenceText) => {
  const prompt = `You are a patient tutor helping a student learn a programming or CS concept for the first time.
${
  referenceText
    ? `Using ONLY the reference material below (don't invent facts beyond it), explain "${title}".`
    : `Explain "${title}" from your own knowledge, clearly and accurately for a student learning it for the first time.`
}

Structure your answer with exactly these headings:

## Overview
2-3 plain-language sentences on what it is and why it matters.

## Key Points
4-6 concise bullet points covering the core ideas.

## Example
A short, concrete example (code if it's a programming concept). Skip this heading entirely if an example doesn't make sense for this topic.

## Common Mistakes
2-3 bullet points on what learners often get wrong.

Keep the whole thing concise and student-friendly — no filler.
${referenceText ? `\nReference material:\n${referenceText}\n` : ""}
Explanation:`;

  const result = await callOllama(prompt);
  return result || "Couldn't generate an explanation right now.";
};

// Used by the Learning page's per-topic chat: answers a follow-up question
// while staying grounded in the topic (and the original explanation/article
// excerpt already given), so it reads like a continued tutoring conversation
// rather than a fresh, disconnected answer.
export const learnFollowUp = async (title, groundingText, history, userMessage) => {
  const historyText = history.map((h) => `${h.role === "user" ? "Student" : "Tutor"}: ${h.content}`).join("\n");

  const prompt = `You are a patient tutor continuing a conversation with a student about "${title}".
Stay focused on this topic (and closely related follow-ups) unless the student clearly changes the subject.
Keep answers concise and clear — a few sentences or a short list, not another full lesson, unless they ask for more depth.

${groundingText ? `Reference material you can draw on:\n${groundingText}\n\n` : ""}Conversation so far:
${historyText}
Student: ${userMessage}
Tutor:`;

  const result = await callOllama(prompt);
  return result || "Sorry, I couldn't come up with an answer just now.";
};
