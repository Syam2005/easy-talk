import { useEffect, useState } from "react";
import { api } from "../context/AuthContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useSocket } from "../context/SocketContext.jsx";
import { LogOut, MessageCircle, Search, UserPlus, Users, Plus, Bot, Mic, Bell, BellOff, BookOpen } from "lucide-react";
import { subscribeToPush, unsubscribeFromPush, isPushSupported } from "../utils/push.js";
import { useToast } from "../context/ToastContext.jsx";
import { useNavigate } from "react-router-dom";

export default function Sidebar({
  selectedChat,
  onSelectDirect,
  onSelectGroup,
  onOpenRequests,
  onOpenCreateGroup,
  onOpenVoiceAssistant,
  groups,
}) {
  const { user, logout } = useAuth();
  const { onlineStatus } = useSocket();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState("chats"); // "chats" | "groups"
  const [friends, setFriends] = useState([]);
  const [query, setQuery] = useState("");
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setPushEnabled(Boolean(sub)))
      .catch(() => {});
  }, []);

  const togglePush = async () => {
    setPushBusy(true);
    try {
      if (pushEnabled) {
        await unsubscribeFromPush(api);
        setPushEnabled(false);
        showToast("Notifications turned off.", "info");
      } else {
        await subscribeToPush(api);
        setPushEnabled(true);
        showToast("Notifications turned on — you'll be notified even when the app is closed.", "success");
      }
    } catch (err) {
      showToast(err.message || "Couldn't update notification settings.", "error");
    } finally {
      setPushBusy(false);
    }
  };

  useEffect(() => {
    api.get("/friends").then((res) => setFriends(res.data));
  }, []);

  const filteredFriends = friends.filter((u) =>
    u.username.toLowerCase().includes(query.toLowerCase())
  );
  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className={`w-full md:w-80 shrink-0 bg-midnight-900 border-r border-midnight-700 flex-col h-full min-h-0 ${
      selectedChat ? "hidden md:flex" : "flex"
    }`}>
      <div className="p-4 border-b border-midnight-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-chat bg-signal-500 flex items-center justify-center">
            <MessageCircle size={16} className="text-white" />
          </div>
          <span className="font-display font-bold text-white">Easy Talk</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onOpenRequests}
            title="Chat requests"
            className="text-mist/50 hover:text-signal-400 transition-colors"
          >
            <UserPlus size={17} />
          </button>
          <button
            onClick={logout}
            title="Log out"
            className="text-mist/50 hover:text-red-400 transition-colors"
          >
            <LogOut size={17} />
          </button>
        </div>
      </div>

      <div className="flex px-3 pt-3 gap-2">
        <button
          onClick={() => setTab("chats")}
          className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition-colors ${
            tab === "chats" ? "bg-signal-500/15 text-signal-400" : "text-mist/50 hover:bg-midnight-800"
          }`}
        >
          Direct
        </button>
        <button
          onClick={() => setTab("groups")}
          className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition-colors ${
            tab === "groups" ? "bg-signal-500/15 text-signal-400" : "text-mist/50 hover:bg-midnight-800"
          }`}
        >
          Groups
        </button>
      </div>

      <div className="p-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tab === "chats" ? "Search friends..." : "Search groups..."}
            className="w-full rounded-lg bg-midnight-800 border border-midnight-600 pl-8 pr-3 py-2 text-sm text-white placeholder:text-mist/30 focus:outline-none focus:ring-2 focus:ring-signal-500/60"
          />
        </div>
      </div>

      <div className="px-3 pb-3 space-y-2">
        <button
          onClick={() => navigate("/learn")}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-medium py-2 transition-colors"
        >
          <BookOpen size={13} />
          Learn a concept (GeeksforGeeks + AI)
        </button>

        <button
          onClick={onOpenVoiceAssistant}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-signal-500/10 hover:bg-signal-500/20 text-signal-400 text-xs font-medium py-2 transition-colors"
        >
          <Mic size={13} />
          Talk to the AI voice assistant
        </button>

        {isPushSupported() && (
          <button
            onClick={togglePush}
            disabled={pushBusy}
            className={`w-full flex items-center justify-center gap-2 rounded-lg text-xs font-medium py-2 transition-colors disabled:opacity-50 ${
              pushEnabled
                ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400"
                : "bg-midnight-800 hover:bg-midnight-700 text-mist/60"
            }`}
          >
            {pushEnabled ? <Bell size={13} /> : <BellOff size={13} />}
            {pushBusy ? "Updating..." : pushEnabled ? "Notifications on" : "Turn on notifications"}
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scroll-stable px-2 pb-3 space-y-1">
        {tab === "chats" &&
          filteredFriends.map((u) => {
            const isOnline = onlineStatus[u._id] ?? u.isOnline;
            const isSelected = selectedChat?.type === "direct" && selectedChat.data._id === u._id;
            return (
              <button
                key={u._id}
                onClick={() => onSelectDirect(u)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                  isSelected ? "bg-signal-500/15" : "hover:bg-midnight-800"
                }`}
              >
                <div className="relative shrink-0">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold text-white ${
                    u.isBot ? "bg-signal-500/20" : "bg-midnight-600"
                  }`}>
                    {u.isBot ? <Bot size={17} className="text-signal-400" /> : u.username[0]?.toUpperCase()}
                  </div>
                  {isOnline && !u.isBot && (
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-midnight-900" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{u.username}</p>
                  <p className="text-xs text-mist/50 truncate">
                    {u.isBot ? "Always here to help" : isOnline ? "Online" : "Offline"}
                  </p>
                </div>
              </button>
            );
          })}

        {tab === "chats" && filteredFriends.length === 0 && (
          <div className="px-3 py-6 text-center">
            <p className="text-xs text-mist/40 mb-2">No friends yet.</p>
            <button
              onClick={onOpenRequests}
              className="text-xs font-medium text-signal-400 hover:text-signal-300"
            >
              Send a chat request
            </button>
          </div>
        )}

        {tab === "groups" && (
          <>
            <button
              onClick={onOpenCreateGroup}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-signal-400 hover:bg-midnight-800 transition-colors mb-1"
            >
              <div className="h-8 w-8 rounded-full bg-signal-500/15 flex items-center justify-center">
                <Plus size={15} />
              </div>
              <span className="text-sm font-medium">New group</span>
            </button>

            {filteredGroups.map((g) => {
              const isSelected = selectedChat?.type === "group" && selectedChat.data._id === g._id;
              return (
                <button
                  key={g._id}
                  onClick={() => onSelectGroup(g)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                    isSelected ? "bg-signal-500/15" : "hover:bg-midnight-800"
                  }`}
                >
                  <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400">
                    <Users size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{g.name}</p>
                    <p className="text-xs text-mist/50 truncate">{g.members.length} members</p>
                  </div>
                </button>
              );
            })}
          </>
        )}
      </div>

      <div className="p-3 border-t border-midnight-700 flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-amber-500/20 flex items-center justify-center text-sm font-semibold text-amber-400">
          {user?.username[0]?.toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-white truncate">{user?.username}</p>
          <p className="text-xs text-mist/50 truncate">{user?.email}</p>
        </div>
      </div>
    </div>
  );
}
