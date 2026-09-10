import { useEffect, useState } from "react";
import { Sparkles, X, Loader2 } from "lucide-react";
import { api } from "../context/AuthContext.jsx";

export default function SummaryPanel({ otherUserId, groupId, onClose }) {
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    const url = groupId ? `/summary/group/${groupId}?limit=50` : `/summary/${otherUserId}?limit=50`;
    api
      .get(url)
      .then((res) => setSummary(res.data.summary))
      .catch((err) =>
        setError(
          err.response?.data?.message ||
            "Couldn't reach the summarizer. Make sure Ollama is running locally."
        )
      )
      .finally(() => setLoading(false));
  }, [otherUserId, groupId]);

  return (
    <div className="absolute right-0 top-0 h-full w-80 bg-midnight-900 border-l border-midnight-700 flex flex-col z-20 shadow-2xl">
      <div className="p-4 border-b border-midnight-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-signal-500/15 flex items-center justify-center">
            <Sparkles size={15} className="text-signal-400" />
          </div>
          <h3 className="font-display font-semibold text-white text-sm">Conversation summary</h3>
        </div>
        <button onClick={onClose} className="text-mist/50 hover:text-white">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="flex items-center gap-2 text-mist/50 text-sm">
            <Loader2 size={15} className="animate-spin" />
            Summarizing the last 50 messages...
          </div>
        )}
        {error && <p className="text-xs text-red-400">{error}</p>}
        {!loading && !error && (
          <p className="text-sm text-mist whitespace-pre-line leading-relaxed">{summary}</p>
        )}
      </div>

      <div className="p-3 border-t border-midnight-700">
        <p className="text-[11px] text-mist/40">
          Generated locally by Ollama — no data leaves your server.
        </p>
      </div>
    </div>
  );
}
