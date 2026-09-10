import { useEffect, useState } from "react";
import { api } from "../context/AuthContext.jsx";
import { useSocket } from "../context/SocketContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { UserPlus, Check, X, Search, Users2, RefreshCw } from "lucide-react";

export default function FriendRequests({ onClose, autoLoadGoogleContacts }) {
  const { socket } = useSocket();
  const { showToast } = useToast();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [groupInvites, setGroupInvites] = useState([]);
  const [sentTo, setSentTo] = useState({});
  const [googleContacts, setGoogleContacts] = useState(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleStatus, setGoogleStatus] = useState({ connected: false, configured: true });

  useEffect(() => {
    api.get("/friends/requests").then((res) => setIncoming(res.data));
    api.get("/groups/invites").then((res) => setGroupInvites(res.data));
    refreshGoogleStatus();
  }, []);

  useEffect(() => {
    if (autoLoadGoogleContacts) loadGoogleContacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoadGoogleContacts]);

  const refreshGoogleStatus = () => {
    api.get("/google/status").then((res) => setGoogleStatus(res.data));
  };

  useEffect(() => {
    if (!socket) return;
    const handler = (req) => setIncoming((prev) => [...prev, req]);
    const groupHandler = (invite) => setGroupInvites((prev) => [...prev, invite]);
    socket.on("friendRequestReceived", handler);
    socket.on("groupInviteReceived", groupHandler);
    return () => {
      socket.off("friendRequestReceived", handler);
      socket.off("groupInviteReceived", groupHandler);
    };
  }, [socket]);

  const respondToGroupInvite = async (inviteId, accept) => {
    await api.post("/groups/invites/respond", { inviteId, accept });
    setGroupInvites((prev) => prev.filter((i) => i._id !== inviteId));
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      api.get(`/friends/search?q=${encodeURIComponent(query)}`).then((res) => setResults(res.data));
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  const sendRequest = async (userId) => {
    try {
      await api.post("/friends/request", { to: userId });
      setSentTo((prev) => ({ ...prev, [userId]: true }));
      showToast("Chat request sent.", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to send request", "error");
    }
  };

  const respond = async (requestId, accept) => {
    await api.post("/friends/respond", { requestId, accept });
    setIncoming((prev) => prev.filter((r) => r._id !== requestId));
  };

  const connectGoogle = async () => {
    try {
      const res = await api.get("/google/auth-url");
      window.location.href = res.data.url;
    } catch (err) {
      showToast(
        err.response?.data?.message || "Couldn't start Google connection. Is it set up on the server?",
        "error",
        7000
      );
    }
  };

  const disconnectGoogle = async () => {
    await api.post("/google/disconnect");
    setGoogleContacts(null);
    refreshGoogleStatus();
    showToast("Disconnected from Google.", "info");
  };

  const inviteContact = (contact) => {
    const subject = encodeURIComponent("Join me on Easy Talk");
    const body = encodeURIComponent(
      `Hey${contact.name !== "Unknown" ? " " + contact.name : ""},\n\nI'm using Easy Talk for chat, calls, and group meetings — thought you might want to join too.\n\nSee you there!`
    );
    window.location.href = `mailto:${contact.email}?subject=${subject}&body=${body}`;
  };

  const loadGoogleContacts = async () => {
    setGoogleLoading(true);
    try {
      const res = await api.get("/google/matched-contacts");
      setGoogleContacts(res.data.allContacts);
      if (res.data.suggestReconnect) {
        showToast(
          "You connected Google before some permissions existed — disconnect and reconnect to check your full contact list (usually finds a lot more).",
          "info",
          8000
        );
      } else if (res.data.allContacts.length === 0) {
        showToast("No contacts found in your Google account.", "info");
      }
    } catch (err) {
      if (err.response?.status === 401) {
        // Refresh token expired/revoked — backend already cleared it, so reflect that here
        setGoogleStatus((prev) => ({ ...prev, connected: false }));
      }
      showToast(err.response?.data?.message || "Connect your Google account first.", "error");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-midnight-900 border border-midnight-700 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="p-4 border-b border-midnight-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-signal-500/15 flex items-center justify-center">
              <UserPlus size={15} className="text-signal-400" />
            </div>
            <h3 className="font-display font-semibold text-white">Chat requests</h3>
          </div>
          <button onClick={onClose} className="text-mist/50 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {incoming.length > 0 && (
            <div>
              <p className="text-xs font-medium text-mist/50 mb-2 uppercase tracking-wide">
                Incoming requests
              </p>
              <div className="space-y-2">
                {incoming.map((r) => (
                  <div key={r._id} className="flex items-center justify-between bg-midnight-800 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-midnight-600 flex items-center justify-center text-xs font-semibold text-white">
                        {r.from.username[0]?.toUpperCase()}
                      </div>
                      <p className="text-sm text-white">{r.from.username}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => respond(r._id, true)}
                        className="h-7 w-7 rounded-md bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 flex items-center justify-center"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => respond(r._id, false)}
                        className="h-7 w-7 rounded-md bg-red-500/15 text-red-400 hover:bg-red-500/25 flex items-center justify-center"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {groupInvites.length > 0 && (
            <div>
              <p className="text-xs font-medium text-mist/50 mb-2 uppercase tracking-wide">
                Group invites
              </p>
              <div className="space-y-2">
                {groupInvites.map((inv) => (
                  <div key={inv._id} className="flex items-center justify-between bg-midnight-800 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm text-white">{inv.group.name}</p>
                      <p className="text-xs text-mist/40">invited by {inv.invitedBy.username}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => respondToGroupInvite(inv._id, true)}
                        className="h-7 w-7 rounded-md bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 flex items-center justify-center"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => respondToGroupInvite(inv._id, false)}
                        className="h-7 w-7 rounded-md bg-red-500/15 text-red-400 hover:bg-red-500/25 flex items-center justify-center"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-mist/50 mb-2 uppercase tracking-wide">
              People you can add
            </p>
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist/40" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by username or email..."
                className="w-full rounded-lg bg-midnight-800 border border-midnight-600 pl-8 pr-3 py-2 text-sm text-white placeholder:text-mist/30 focus:outline-none focus:ring-2 focus:ring-signal-500/60"
              />
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {results.map((u) => (
                <div key={u._id} className="flex items-center justify-between bg-midnight-800 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-midnight-600 flex items-center justify-center text-xs font-semibold text-white">
                      {u.username[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm text-white">{u.username}</p>
                      <p className="text-xs text-mist/40">{u.email}</p>
                    </div>
                  </div>
                  <button
                    disabled={sentTo[u._id]}
                    onClick={() => sendRequest(u._id)}
                    className="text-xs font-medium rounded-md px-2.5 py-1.5 bg-signal-500/15 text-signal-400 hover:bg-signal-500/25 disabled:opacity-50"
                  >
                    {sentTo[u._id] ? "Sent" : "Add"}
                  </button>
                </div>
              ))}
              {results.length === 0 && (
                <p className="text-xs text-mist/40 text-center py-3">
                  Nobody left to add — everyone's already your friend.
                </p>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-mist/50 mb-2 uppercase tracking-wide">
              Google contacts
            </p>
            <div className="bg-midnight-800 rounded-lg p-3 space-y-2">
              <p className="text-xs text-mist/60">
                Find friends who are already on Easy Talk by matching your Google contacts.
              </p>

              {!googleStatus.configured ? (
                <p className="text-xs text-amber-400">
                  This isn't set up on the server yet — see the README section on Google Contacts import.
                </p>
              ) : (
                <div className="flex gap-2 items-center">
                  {googleStatus.connected ? (
                    <>
                      <span className="text-xs font-medium text-emerald-400 flex items-center gap-1">
                        <Check size={13} /> Connected
                      </span>
                      <button
                        onClick={loadGoogleContacts}
                        disabled={googleLoading}
                        className="text-xs font-medium rounded-md px-3 py-1.5 bg-signal-500/15 text-signal-400 hover:bg-signal-500/25 disabled:opacity-50 flex items-center gap-1"
                      >
                        <RefreshCw size={12} className={googleLoading ? "animate-spin" : ""} />
                        {googleLoading ? "Checking..." : "Find friends"}
                      </button>
                      <button
                        onClick={disconnectGoogle}
                        className="text-xs font-medium text-mist/40 hover:text-red-400"
                      >
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={connectGoogle}
                      className="text-xs font-medium rounded-md px-3 py-1.5 bg-midnight-700 text-white hover:bg-midnight-600 flex items-center gap-1.5"
                    >
                      <Users2 size={13} /> Connect Google
                    </button>
                  )}
                </div>
              )}

              {googleContacts && (
                <div className="pt-2">
                  {googleContacts.length === 0 ? (
                    <p className="text-xs text-mist/40">No contacts found in your Google account.</p>
                  ) : (
                    <>
                      <p className="text-[11px] text-mist/40 mb-2">
                        {googleContacts.filter((c) => c.onEasyTalk).length} already on Easy Talk ·{" "}
                        {googleContacts.filter((c) => !c.onEasyTalk).length} not yet
                      </p>
                      <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                        {googleContacts.map((c) => (
                          <div
                            key={c.email}
                            className="flex items-center justify-between bg-midnight-900 rounded-lg px-3 py-2"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                                  c.onEasyTalk ? "bg-signal-500/20 text-signal-400" : "bg-midnight-700 text-mist/50"
                                }`}
                              >
                                {c.name?.[0]?.toUpperCase() || "?"}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm text-white truncate">{c.name}</p>
                                <p className="text-xs text-mist/40 truncate">{c.email}</p>
                              </div>
                            </div>
                            {c.onEasyTalk ? (
                              <button
                                disabled={sentTo[c.user._id]}
                                onClick={() => sendRequest(c.user._id)}
                                className="text-xs font-medium rounded-md px-2.5 py-1.5 bg-signal-500/15 text-signal-400 hover:bg-signal-500/25 disabled:opacity-50 shrink-0"
                              >
                                {sentTo[c.user._id] ? "Sent" : "Add"}
                              </button>
                            ) : (
                              <button
                                onClick={() => inviteContact(c)}
                                className="text-xs font-medium rounded-md px-2.5 py-1.5 bg-midnight-700 text-mist hover:text-white hover:bg-midnight-600 shrink-0"
                              >
                                Invite
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
