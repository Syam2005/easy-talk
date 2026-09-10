import { useState } from "react";
import { X, Clock } from "lucide-react";
import { api } from "../context/AuthContext.jsx";

export default function ScheduleModal({ receiverId, onClose, onScheduled }) {
  const [text, setText] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!text.trim() || !date || !time) {
      setError("Please fill in the message, date, and time.");
      return;
    }
    const sendAt = new Date(`${date}T${time}`);
    if (sendAt.getTime() <= Date.now()) {
      setError("Pick a time in the future.");
      return;
    }

    setBusy(true);
    try {
      const res = await api.post("/messages/schedule", {
        receiver: receiverId,
        text,
        sendAt: sendAt.toISOString(),
      });
      onScheduled(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to schedule message.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-midnight-900 border border-midnight-700 rounded-2xl w-full max-w-md p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
              <Clock size={15} className="text-amber-400" />
            </div>
            <h3 className="font-display font-semibold text-white">Schedule a message</h3>
          </div>
          <button onClick={onClose} className="text-mist/50 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your message..."
            rows={3}
            className="w-full rounded-lg bg-midnight-800 border border-midnight-600 px-3 py-2 text-sm text-white placeholder:text-mist/30 focus:outline-none focus:ring-2 focus:ring-signal-500/60 resize-none"
          />
          <div className="flex gap-3">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="flex-1 rounded-lg bg-midnight-800 border border-midnight-600 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-signal-500/60"
            />
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="flex-1 rounded-lg bg-midnight-800 border border-midnight-600 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-signal-500/60"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-amber-500 hover:bg-amber-400 transition-colors py-2.5 text-sm font-semibold text-midnight-950 disabled:opacity-60"
          >
            {busy ? "Scheduling..." : "Schedule message"}
          </button>
        </form>
      </div>
    </div>
  );
}
