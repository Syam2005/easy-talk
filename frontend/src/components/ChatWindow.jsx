import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import {
  Sparkles,
  Clock3,
  Video,
  Bot,
  FileText,
  Download,
  Users,
  ArrowLeft,
  ExternalLink,
  UserPlus,
  LogOut,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { API_URL } from "../context/AuthContext.jsx";

// Detects a Google Meet link inside a message's text so it can be rendered
// as a proper "Join" button instead of a plain, easy-to-miss URL.
const MEET_LINK_RE = /https:\/\/meet\.google\.com\/[a-z0-9-]+/i;

export default function ChatWindow({
  messages,
  currentUserId,
  otherUser,
  isGroup,
  typing,
  onOpenSummary,
  onStartMeet,
  meetLoading,
  onAddMembers,
  onExitGroup,
  onEditMessage,
  onBack,
}) {
  const bottomRef = useRef(null);
  const displayName = isGroup ? otherUser?.name : otherUser?.username;
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const startEdit = (m) => {
    setEditingId(m._id);
    setEditText(m.text);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  const saveEdit = (id) => {
    const trimmed = editText.trim();
    if (trimmed) onEditMessage?.(id, trimmed);
    cancelEdit();
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0">
      <div className="p-4 border-b border-midnight-700 bg-midnight-900 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="md:hidden h-8 w-8 rounded-lg flex items-center justify-center text-mist/60 hover:text-white hover:bg-midnight-800 transition-colors shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold text-white ${
            otherUser?.isBot ? "bg-signal-500/20" : isGroup ? "bg-amber-500/20" : "bg-midnight-600"
          }`}>
            {otherUser?.isBot ? (
              <Bot size={16} className="text-signal-400" />
            ) : isGroup ? (
              <Users size={16} className="text-amber-400" />
            ) : (
              displayName?.[0]?.toUpperCase()
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-white">{displayName}</p>
            <p className="text-xs text-mist/50">
              {otherUser?.isBot
                ? "Always here to help"
                : isGroup
                ? `${otherUser?.members?.length || 0} members`
                : typing
                ? <span className="text-signal-400">typing...</span>
                : otherUser?.isOnline ? "Online" : "Offline"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isGroup && (
            <button
              onClick={onAddMembers}
              title="Add members"
              className="flex items-center gap-1.5 rounded-lg border border-midnight-600 hover:border-signal-500 px-3 py-1.5 text-xs font-medium text-mist hover:text-white transition-colors"
            >
              <UserPlus size={13} className="text-amber-400" />
              Add
            </button>
          )}
          {isGroup && (
            <button
              onClick={onExitGroup}
              title="Exit group"
              className="flex items-center gap-1.5 rounded-lg border border-midnight-600 hover:border-red-500 px-3 py-1.5 text-xs font-medium text-mist hover:text-red-400 transition-colors"
            >
              <LogOut size={13} />
              Exit
            </button>
          )}
          {!otherUser?.isBot && (
            <button
              onClick={onStartMeet}
              disabled={meetLoading}
              title="Start a Google Meet call"
              className="flex items-center gap-1.5 rounded-lg border border-midnight-600 hover:border-signal-500 px-3 py-1.5 text-xs font-medium text-mist hover:text-white transition-colors disabled:opacity-50"
            >
              <Video size={13} className="text-signal-400" />
              {meetLoading ? "Starting..." : "Google Meet"}
            </button>
          )}
          {!otherUser?.isBot && (
            <button
              onClick={onOpenSummary}
              className="flex items-center gap-1.5 rounded-lg border border-midnight-600 hover:border-signal-500 px-3 py-1.5 text-xs font-medium text-mist hover:text-white transition-colors"
            >
              <Sparkles size={13} className="text-signal-400" />
              Summarize
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scroll-stable p-6 space-y-3 bg-midnight-950">
        {messages.length === 0 && (
          <p className="text-sm text-mist/40 text-center mt-10">
            No messages yet. Say hello to {otherUser?.username}.
          </p>
        )}

        {messages.map((m) => {
          const mine = (m.sender?._id || m.sender) === currentUserId;
          const editable = mine && m.mediaType === "none" && m.text && !MEET_LINK_RE.test(m.text);
          const isEditing = editingId === m._id;
          return (
            <div key={m._id} className={`flex group ${mine ? "justify-end" : "justify-start"}`}>
              {mine && editable && !isEditing && (
                <button
                  onClick={() => startEdit(m)}
                  title="Edit message"
                  className="self-center mr-1.5 opacity-0 group-hover:opacity-100 text-mist/40 hover:text-white transition-opacity shrink-0"
                >
                  <Pencil size={13} />
                </button>
              )}
              <div
                className={`max-w-[65%] rounded-chat px-4 py-2.5 text-sm leading-relaxed ${
                  mine
                    ? "bg-signal-500 text-white rounded-br-sm"
                    : "bg-midnight-800 text-mist rounded-bl-sm"
                }`}
              >
                {isGroup && !mine && (
                  <p className="text-[11px] font-semibold text-signal-400 mb-0.5">
                    {m.sender?.username}
                  </p>
                )}
                {m.isScheduled && (
                  <div className="flex items-center gap-1 mb-1 text-[10px] opacity-70">
                    <Clock3 size={11} />
                    Sent from schedule
                  </div>
                )}
                {m.mediaType === "audio" && m.mediaUrl && (
                  <audio controls src={`${API_URL}${m.mediaUrl}`} className="max-w-full h-9 mb-1" />
                )}
                {m.mediaType === "image" && m.mediaUrl && (
                  <a href={`${API_URL}${m.mediaUrl}`} target="_blank" rel="noreferrer">
                    <img
                      src={`${API_URL}${m.mediaUrl}`}
                      alt={m.fileName || "attachment"}
                      className="max-w-full max-h-64 rounded-lg mb-1 object-cover"
                    />
                  </a>
                )}
                {m.mediaType === "file" && m.mediaUrl && (
                  <a
                    href={`${API_URL}${m.mediaUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 mb-1 ${
                      mine ? "bg-white/10" : "bg-midnight-700"
                    }`}
                  >
                    <FileText size={16} className="shrink-0" />
                    <span className="text-xs truncate flex-1">{m.fileName || "Download file"}</span>
                    <Download size={14} className="shrink-0 opacity-70" />
                  </a>
                )}
                {isEditing ? (
                  <div className="space-y-1.5">
                    <textarea
                      autoFocus
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          saveEdit(m._id);
                        }
                        if (e.key === "Escape") cancelEdit();
                      }}
                      rows={2}
                      className="w-full resize-none rounded-lg bg-black/20 border border-white/30 px-2 py-1.5 text-sm text-white placeholder:text-white/40 focus:outline-none"
                    />
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={cancelEdit}
                        className="h-6 w-6 rounded flex items-center justify-center hover:bg-white/10"
                        title="Cancel"
                      >
                        <X size={13} />
                      </button>
                      <button
                        onClick={() => saveEdit(m._id)}
                        className="h-6 w-6 rounded flex items-center justify-center bg-white/20 hover:bg-white/30"
                        title="Save"
                      >
                        <Check size={13} />
                      </button>
                    </div>
                  </div>
                ) : m.text && MEET_LINK_RE.test(m.text) ? (
                  <a
                    href={m.text.match(MEET_LINK_RE)[0]}
                    target="_blank"
                    rel="noreferrer"
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 mt-1 font-medium ${
                      mine ? "bg-white/15 hover:bg-white/20" : "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                    }`}
                  >
                    <Video size={15} className="shrink-0" />
                    <span className="flex-1">Join Google Meet</span>
                    <ExternalLink size={13} className="shrink-0 opacity-70" />
                  </a>
                ) : (
                  m.text && <p>{m.text}</p>
                )}
                {!isEditing && (
                  <p
                    className={`text-[10px] mt-1 ${
                      mine ? "text-white/60" : "text-mist/40"
                    }`}
                  >
                    {m.createdAt ? format(new Date(m.createdAt), "h:mm a") : ""}
                    {m.edited && <span className="italic"> · edited</span>}
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {typing && (
          <div className="flex justify-start">
            <div className="bg-midnight-800 rounded-chat rounded-bl-sm px-4 py-3 flex gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-mist/60 animate-bounce [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-mist/60 animate-bounce [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-mist/60 animate-bounce" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
