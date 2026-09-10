import { useEffect, useState } from "react";
import { api } from "../context/AuthContext.jsx";
import { X, UserPlus } from "lucide-react";

// Adds new members to a group that already exists — separate from
// CreateGroupModal, which only sets initial members at creation time.
export default function AddMembersModal({ group, onClose, onInvited }) {
  const [friends, setFriends] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState(new Set());

  const currentMemberIds = new Set(group.members.map((m) => (typeof m === "string" ? m : m._id)));

  useEffect(() => {
    api.get("/friends").then((res) => {
      setFriends(res.data.filter((f) => !f.isBot && !currentMemberIds.has(f._id)));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (selected.size === 0) {
      setError("Pick at least one friend to invite.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      // Send one invite per selected friend — same endpoint an existing
      // member uses to grow a group, they'll each get a request to accept.
      const results = await Promise.allSettled(
        [...selected].map((id) => api.post(`/groups/${group._id}/invite`, { userId: id }))
      );
      const okIds = [...selected].filter((_, i) => results[i].status === "fulfilled");
      setSentTo(new Set(okIds));
      const failed = results.filter((r) => r.status === "rejected");
      if (failed.length > 0 && okIds.length === 0) {
        setError(failed[0].reason?.response?.data?.message || "Couldn't send invites.");
      } else {
        onInvited?.();
        if (failed.length === 0) onClose();
      }
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
              <UserPlus size={15} className="text-amber-400" />
            </div>
            <h3 className="font-display font-semibold text-white">Add members to {group.name}</h3>
          </div>
          <button onClick={onClose} className="text-mist/50 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            {friends.length === 0 && (
              <p className="text-xs text-mist/40">
                Everyone in your friends list is already in this group (or you don't have any friends to add yet).
              </p>
            )}
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {friends.map((f) => (
                <label
                  key={f._id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-midnight-800 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(f._id)}
                    onChange={() => toggle(f._id)}
                    disabled={sentTo.has(f._id)}
                    className="accent-signal-500"
                  />
                  <div className="h-7 w-7 rounded-full bg-midnight-600 flex items-center justify-center text-xs font-semibold text-white">
                    {f.username[0]?.toUpperCase()}
                  </div>
                  <span className="text-sm text-white flex-1">{f.username}</span>
                  {sentTo.has(f._id) && <span className="text-[10px] text-emerald-400">Invited</span>}
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={busy || friends.length === 0}
            className="w-full rounded-lg bg-amber-500 hover:bg-amber-400 transition-colors py-2.5 text-sm font-semibold text-midnight-950 disabled:opacity-60"
          >
            {busy ? "Sending invites..." : "Send invites"}
          </button>
        </form>
      </div>
    </div>
  );
}
