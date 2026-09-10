import { useEffect, useState } from "react";
import { api } from "../context/AuthContext.jsx";
import { X, Users } from "lucide-react";

export default function CreateGroupModal({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [friends, setFriends] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/friends").then((res) => setFriends(res.data.filter((f) => !f.isBot)));
  }, []);

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Give the group a name.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await api.post("/groups", { name, memberIds: [...selected] });
      onCreated(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create group");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-midnight-900 border border-midnight-700 rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col">
        <div className="p-4 border-b border-midnight-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
              <Users size={15} className="text-amber-400" />
            </div>
            <h3 className="font-display font-semibold text-white">New group</h3>
          </div>
          <button onClick={onClose} className="text-mist/50 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Group name"
            className="w-full rounded-lg bg-midnight-800 border border-midnight-600 px-3 py-2.5 text-sm text-white placeholder:text-mist/30 focus:outline-none focus:ring-2 focus:ring-signal-500/60"
          />

          <div>
            <p className="text-xs font-medium text-mist/50 mb-2 uppercase tracking-wide">
              Invite friends (they'll get a request to join)
            </p>
            {friends.length === 0 && (
              <p className="text-xs text-mist/40">
                You don't have any friends yet — send some chat requests first.
              </p>
            )}
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {friends.map((f) => (
                <label
                  key={f._id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-midnight-800 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(f._id)}
                    onChange={() => toggle(f._id)}
                    className="accent-signal-500"
                  />
                  <div className="h-7 w-7 rounded-full bg-midnight-600 flex items-center justify-center text-xs font-semibold text-white">
                    {f.username[0]?.toUpperCase()}
                  </div>
                  <span className="text-sm text-white">{f.username}</span>
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-amber-500 hover:bg-amber-400 transition-colors py-2.5 text-sm font-semibold text-midnight-950 disabled:opacity-60"
          >
            {busy ? "Creating..." : "Create group"}
          </button>
        </form>
      </div>
    </div>
  );
}
