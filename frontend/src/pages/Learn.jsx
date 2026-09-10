import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import {
  ArrowLeft,
  Search,
  BookOpen,
  ExternalLink,
  Loader2,
  Trash2,
  Sparkles,
  Clock3,
  Send,
} from "lucide-react";

// Lightweight renderer for the model's structured output (## headings, - bullets,
// ```code``` fences) — avoids pulling in a full markdown library for a format
// we fully control via the prompt. Plain follow-up replies (no ## headings)
// just render as normal paragraphs.
function FormattedText({ text }) {
  const lines = text.split("\n");
  const blocks = [];
  let codeBuffer = null;

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      if (codeBuffer === null) {
        codeBuffer = [];
      } else {
        blocks.push({ type: "code", content: codeBuffer.join("\n") });
        codeBuffer = null;
      }
      continue;
    }
    if (codeBuffer !== null) {
      codeBuffer.push(line);
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push({ type: "heading", content: line.slice(3).trim() });
    } else if (/^[-*]\s+/.test(line.trim())) {
      blocks.push({ type: "bullet", content: line.trim().replace(/^[-*]\s+/, "") });
    } else if (line.trim()) {
      blocks.push({ type: "text", content: line.trim() });
    }
  }

  return (
    <div className="space-y-2">
      {blocks.map((b, i) => {
        if (b.type === "heading") {
          return (
            <h3 key={i} className="text-sm font-display font-semibold text-signal-400 mt-4 first:mt-0">
              {b.content}
            </h3>
          );
        }
        if (b.type === "bullet") {
          return (
            <div key={i} className="flex gap-2 text-sm text-mist/90 pl-1">
              <span className="text-signal-400 shrink-0">•</span>
              <span>{b.content}</span>
            </div>
          );
        }
        if (b.type === "code") {
          return (
            <pre key={i} className="bg-midnight-950 border border-midnight-700 rounded-lg p-3 text-xs text-emerald-300 overflow-x-auto">
              <code>{b.content}</code>
            </pre>
          );
        }
        return (
          <p key={i} className="text-sm text-mist/90">
            {b.content}
          </p>
        );
      })}
    </div>
  );
}

export default function Learn() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);

  const [active, setActive] = useState(null); // full note: { _id, title, url, source, messages }
  const [explaining, setExplaining] = useState(false);
  const [asking, setAsking] = useState(false);
  const [followUp, setFollowUp] = useState("");

  const [notes, setNotes] = useState([]);
  const [showNotes, setShowNotes] = useState(false);

  const scrollRef = useRef(null);

  const loadNotes = () => api.get("/learn/notes").then((res) => setNotes(res.data));

  useEffect(() => {
    loadNotes();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [active?.messages?.length, explaining, asking]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearched(true);
    setActive(null);
    try {
      const res = await api.get(`/learn/search?q=${encodeURIComponent(query.trim())}`);
      setResults(res.data.results);
      if (res.data.results.length === 0) {
        showToast("No GeeksforGeeks articles found for that — try different wording.", "info");
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Search failed.", "error");
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectResult = async (result) => {
    setExplaining(true);
    setActive({ title: result.title, url: result.url, messages: [] });
    try {
      const res = await api.post("/learn/explain", { url: result.url, title: result.title });
      setActive(res.data.note);
      loadNotes();
    } catch (err) {
      showToast(err.response?.data?.message || "Couldn't generate an explanation.", "error");
      setActive(null);
    } finally {
      setExplaining(false);
    }
  };

  const openSavedNote = (note) => {
    setShowNotes(false);
    setActive(note);
  };

  const handleDeleteNote = async (id, e) => {
    e.stopPropagation();
    await api.delete(`/learn/notes/${id}`);
    setNotes((prev) => prev.filter((n) => n._id !== id));
    if (active?._id === id) setActive(null);
  };

  const handleAsk = async (e) => {
    e.preventDefault();
    const message = followUp.trim();
    if (!message || !active?._id || asking) return;

    // Optimistically show the question right away
    setActive((prev) => ({ ...prev, messages: [...prev.messages, { role: "user", content: message }] }));
    setFollowUp("");
    setAsking(true);
    try {
      const res = await api.post(`/learn/notes/${active._id}/chat`, { message });
      setActive((prev) => ({ ...prev, messages: res.data.messages }));
    } catch (err) {
      showToast(err.response?.data?.message || "Couldn't get a reply.", "error");
      // Roll back the optimistic question if the request actually failed
      setActive((prev) => ({ ...prev, messages: prev.messages.slice(0, -1) }));
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-midnight-950">
      <div className="p-4 border-b border-midnight-700 bg-midnight-900 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-mist/60 hover:text-white hover:bg-midnight-800 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="h-8 w-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
            <BookOpen size={16} className="text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-display font-semibold text-white">Learn</p>
            <p className="text-xs text-mist/50">Search GeeksforGeeks, then chat about it</p>
          </div>
        </div>
        <button
          onClick={() => setShowNotes((s) => !s)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
            showNotes
              ? "border-signal-500 text-signal-400"
              : "border-midnight-600 text-mist hover:text-white hover:border-signal-500"
          }`}
        >
          <Clock3 size={13} />
          Saved ({notes.length})
        </button>
      </div>

      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Left: search + results, or saved notes */}
        <div className={`w-full md:w-96 border-r border-midnight-700 flex flex-col min-h-0 shrink-0 ${active ? "hidden md:flex" : "flex"}`}>
          <form onSubmit={handleSearch} className="p-3 border-b border-midnight-700">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist/40" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. binary search, recursion, OOP..."
                className="w-full rounded-lg bg-midnight-800 border border-midnight-600 pl-8 pr-3 py-2.5 text-sm text-white placeholder:text-mist/30 focus:outline-none focus:ring-2 focus:ring-signal-500/60"
              />
            </div>
            <button
              type="submit"
              disabled={searching || !query.trim()}
              className="mt-2 w-full rounded-lg bg-signal-500 hover:bg-signal-400 transition-colors py-2 text-sm font-semibold text-midnight-950 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              {searching ? "Searching..." : "Search"}
            </button>
          </form>

          <div className="flex-1 min-h-0 overflow-y-auto scroll-stable p-2 space-y-1">
            {showNotes ? (
              notes.length === 0 ? (
                <p className="text-xs text-mist/40 text-center mt-8 px-4">
                  Topics you explore are saved here automatically, chat history and all.
                </p>
              ) : (
                notes.map((n) => (
                  <button
                    key={n._id}
                    onClick={() => openSavedNote(n)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors group ${
                      active?._id === n._id ? "bg-signal-500/15" : "hover:bg-midnight-800"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-white font-medium line-clamp-2">{n.title}</p>
                      <button
                        onClick={(e) => handleDeleteNote(n._id, e)}
                        className="text-mist/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <p className="text-xs text-mist/40 mt-0.5">
                      {n.source === "ai-fallback" ? "AI knowledge" : "GeeksforGeeks"} ·{" "}
                      {n.messages?.length > 1 ? `${n.messages.length - 1} follow-up${n.messages.length > 2 ? "s" : ""} · ` : ""}
                      {new Date(n.createdAt).toLocaleDateString()}
                    </p>
                  </button>
                ))
              )
            ) : (
              <>
                {searched && !searching && results.length === 0 && (
                  <p className="text-xs text-mist/40 text-center mt-8 px-4">
                    Nothing found. Try a different phrase.
                  </p>
                )}
                {results.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelectResult(r)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                      active?.url === r.url ? "bg-signal-500/15" : "hover:bg-midnight-800"
                    }`}
                  >
                    <p className="text-sm text-white font-medium line-clamp-2">{r.title}</p>
                    {r.snippet && (
                      <p className="text-xs text-mist/40 mt-0.5 line-clamp-2">{r.snippet}</p>
                    )}
                  </button>
                ))}
                {!searched && (
                  <p className="text-xs text-mist/40 text-center mt-8 px-4">
                    Search any concept — data structures, algorithms, OOP, DBMS, OS, anything
                    GeeksforGeeks covers — pick a result, and keep asking questions about it.
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right: topic chat */}
        <div className={`flex-1 min-h-0 flex-col min-w-0 ${active ? "flex" : "hidden md:flex"}`}>
          {!active ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <div className="h-14 w-14 rounded-2xl bg-amber-500/15 flex items-center justify-center mb-4">
                <Sparkles size={24} className="text-amber-400" />
              </div>
              <h2 className="font-display text-lg font-semibold text-white mb-1">
                Pick a result to start
              </h2>
              <p className="text-sm text-mist/50 max-w-xs">
                Search for a concept on the left, click a result to get it explained, then keep
                chatting to go deeper.
              </p>
            </div>
          ) : (
            <>
              <div className="p-3 border-b border-midnight-700 flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setActive(null)}
                  className="md:hidden h-8 w-8 rounded-lg flex items-center justify-center text-mist/60 hover:text-white hover:bg-midnight-800 shrink-0"
                >
                  <ArrowLeft size={16} />
                </button>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{active.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {active.url && (
                      <a
                        href={active.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs text-signal-400 hover:text-signal-300"
                      >
                        Original article <ExternalLink size={10} />
                      </a>
                    )}
                    {active.source === "ai-fallback" && (
                      <span className="text-[10px] font-medium text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                        AI's general knowledge
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto scroll-stable p-4 space-y-4">
                {explaining ? (
                  <div className="flex items-center gap-2 text-sm text-mist/50">
                    <Loader2 size={16} className="animate-spin" />
                    Reading the article and writing an explanation...
                  </div>
                ) : (
                  active.messages.map((m, i) =>
                    m.role === "assistant" ? (
                      <div key={i} className="bg-midnight-900 border border-midnight-700 rounded-xl p-4 max-w-2xl">
                        <FormattedText text={m.content} />
                      </div>
                    ) : (
                      <div key={i} className="flex justify-end">
                        <div className="bg-signal-500 text-white rounded-xl rounded-tr-sm px-3.5 py-2 max-w-md text-sm">
                          {m.content}
                        </div>
                      </div>
                    )
                  )
                )}
                {asking && (
                  <div className="flex items-center gap-2 text-sm text-mist/50">
                    <Loader2 size={16} className="animate-spin" />
                    Thinking...
                  </div>
                )}
              </div>

              <form onSubmit={handleAsk} className="p-3 border-t border-midnight-700 flex items-center gap-2 shrink-0">
                <input
                  value={followUp}
                  onChange={(e) => setFollowUp(e.target.value)}
                  placeholder={active._id ? "Ask a follow-up question..." : "Wait for the explanation to finish..."}
                  disabled={!active._id || explaining}
                  className="flex-1 rounded-lg bg-midnight-800 border border-midnight-600 px-3 py-2.5 text-sm text-white placeholder:text-mist/30 focus:outline-none focus:ring-2 focus:ring-signal-500/60 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!followUp.trim() || !active._id || asking || explaining}
                  className="h-10 w-10 shrink-0 rounded-lg bg-signal-500 hover:bg-signal-400 disabled:opacity-40 transition-colors flex items-center justify-center"
                >
                  <Send size={16} className="text-white" />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
