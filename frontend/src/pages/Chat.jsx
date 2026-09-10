import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useSocket } from "../context/SocketContext.jsx";
import { api } from "../context/AuthContext.jsx";
import Sidebar from "../components/Sidebar.jsx";
import ChatWindow from "../components/ChatWindow.jsx";
import MessageInput from "../components/MessageInput.jsx";
import ScheduleModal from "../components/ScheduleModal.jsx";
import SummaryPanel from "../components/SummaryPanel.jsx";
import FriendRequests from "../components/FriendRequests.jsx";
import CreateGroupModal from "../components/CreateGroupModal.jsx";
import AddMembersModal from "../components/AddMembersModal.jsx";
import VoiceAssistant from "../components/VoiceAssistant.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { MessageCircle } from "lucide-react";

export default function Chat() {
  const { user } = useAuth();
  const { socket, connected } = useSocket();
  const { showToast } = useToast();

  // selectedChat = { type: "direct" | "group", data: user or group object }
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [groups, setGroups] = useState([]);
  const [botUser, setBotUser] = useState(null);

  const [showSchedule, setShowSchedule] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [showVoiceAssistant, setShowVoiceAssistant] = useState(false);
  const [meetLoading, setMeetLoading] = useState(false);
  const [autoLoadGoogleContacts, setAutoLoadGoogleContacts] = useState(false);

  // Handle the redirect back from Google's consent screen
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleConnected = params.get("googleConnected");
    if (googleConnected === null) return;

    if (googleConnected === "1") {
      showToast("Google connected! Finding friends from your contacts...", "success");
      setShowRequests(true);
      setAutoLoadGoogleContacts(true);
    } else {
      const reason = params.get("reason");
      const messages = {
        denied: "Google connection was cancelled.",
        no_refresh_token: "Google didn't return the access needed — try disconnecting from Easy Talk in your Google account settings, then reconnect.",
        exchange_failed: "Couldn't complete the Google connection. This usually means the redirect URL isn't set up correctly on the server (see README).",
      };
      showToast(messages[reason] || "Couldn't connect Google account.", "error", 7000);
    }

    // Clean the URL so refreshing doesn't re-trigger this
    window.history.replaceState({}, "", window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Find the built-in assistant among friends so the voice assistant can reach it directly.
  useEffect(() => {
    api.get("/friends").then((res) => {
      const bot = res.data.find((f) => f.isBot);
      if (bot) setBotUser(bot);
    });
  }, []);

  // Load my groups on mount, join their socket rooms — and rejoin automatically
  // if the socket ever reconnects after a network blip (otherwise the server
  // would forget which rooms this connection is in, and messages would silently
  // stop arriving until a manual refresh).
  useEffect(() => {
    if (!socket) return;

    const joinAllGroupRooms = () => {
      api.get("/groups").then((res) => {
        setGroups(res.data);
        socket.emit("joinGroupRooms", res.data.map((g) => g._id));
      });
    };

    joinAllGroupRooms();
    socket.on("connect", joinAllGroupRooms);
    return () => socket.off("connect", joinAllGroupRooms);
  }, [socket]);

  // Load conversation history when a chat is selected
  useEffect(() => {
    if (!selectedChat) return;
    const url =
      selectedChat.type === "direct"
        ? `/messages/${selectedChat.data._id}`
        : `/groups/${selectedChat.data._id}/messages`;
    api.get(url).then((res) => setMessages(res.data));
  }, [selectedChat]);

  // Keep the selected group's data (member list, etc.) fresh whenever the
  // groups list is refetched — otherwise selectedChat.data stays a stale
  // snapshot from whenever it was first clicked.
  useEffect(() => {
    if (selectedChat?.type !== "group") return;
    const fresh = groups.find((g) => g._id === selectedChat.data._id);
    if (fresh && fresh !== selectedChat.data) {
      setSelectedChat({ type: "group", data: fresh });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups]);

  // Direct + group message listeners
  useEffect(() => {
    if (!socket) return;

    const handleReceive = (message) => {
      const otherId = message.sender?._id || message.sender;
      if (selectedChat?.type === "direct" && otherId === selectedChat.data._id) {
        setMessages((prev) => [...prev, message]);
      }
    };

    const handleAck = (message) => {
      setMessages((prev) => [...prev, message]);
    };

    const handleGroupReceive = (message) => {
      if (selectedChat?.type === "group" && message.group === selectedChat.data._id) {
        setMessages((prev) => [...prev, message]);
      }
    };

    const handleTyping = ({ userId }) => {
      if (selectedChat?.type === "direct" && userId === selectedChat.data._id) {
        setTypingUsers((prev) => ({ ...prev, [userId]: true }));
      }
    };

    const handleStopTyping = ({ userId }) => {
      setTypingUsers((prev) => ({ ...prev, [userId]: false }));
    };

    const handleGroupJoined = () => {
      api.get("/groups").then((res) => setGroups(res.data));
    };

    const handleGroupMemberLeft = ({ groupId, userId: leftUserId }) => {
      api.get("/groups").then((res) => setGroups(res.data));
      if (leftUserId === user.id && selectedChat?.type === "group" && selectedChat.data._id === groupId) {
        // We're seeing our own departure reflected back (e.g. a second tab) — close the chat.
        setSelectedChat(null);
      }
    };

    const handleAddedToGroup = ({ group }) => {
      setGroups((prev) => {
        if (prev.some((g) => g._id === group._id)) return prev;
        return [...prev, group];
      });
      socket.emit("joinGroupRooms", [group._id]);
    };

    const handleMessageEdited = (updated) => {
      setMessages((prev) => prev.map((m) => (m._id === updated._id ? updated : m)));
    };

    socket.on("receiveMessage", handleReceive);
    socket.on("messageSentAck", handleAck);
    socket.on("scheduledMessageSent", handleAck);
    socket.on("receiveGroupMessage", handleGroupReceive);
    socket.on("userTyping", handleTyping);
    socket.on("userStoppedTyping", handleStopTyping);
    socket.on("groupMemberJoined", handleGroupJoined);
    socket.on("groupMemberLeft", handleGroupMemberLeft);
    socket.on("addedToGroup", handleAddedToGroup);
    socket.on("messageEdited", handleMessageEdited);

    return () => {
      socket.off("receiveMessage", handleReceive);
      socket.off("messageSentAck", handleAck);
      socket.off("scheduledMessageSent", handleAck);
      socket.off("receiveGroupMessage", handleGroupReceive);
      socket.off("userTyping", handleTyping);
      socket.off("userStoppedTyping", handleStopTyping);
      socket.off("groupMemberJoined", handleGroupJoined);
      socket.off("groupMemberLeft", handleGroupMemberLeft);
      socket.off("addedToGroup", handleAddedToGroup);
      socket.off("messageEdited", handleMessageEdited);
    };
  }, [socket, selectedChat]);

  const handleSend = useCallback(
    (payload) => {
      if (!selectedChat || !socket) return;
      const { text, mediaUrl, mediaType, fileName } = payload;
      if (selectedChat.type === "direct") {
        socket.emit("sendMessage", { receiver: selectedChat.data._id, text, mediaUrl, mediaType, fileName });
      } else {
        socket.emit("sendGroupMessage", { groupId: selectedChat.data._id, text, mediaUrl, mediaType, fileName });
      }
    },
    [socket, selectedChat]
  );

  const handleTypingStart = () => {
    if (selectedChat?.type === "direct" && socket) {
      socket.emit("typing", { receiver: selectedChat.data._id });
    }
  };

  const handleTypingStop = () => {
    if (selectedChat?.type === "direct" && socket) {
      socket.emit("stopTyping", { receiver: selectedChat.data._id });
    }
  };

  const handleSelectDirect = (u) => {
    setSelectedChat({ type: "direct", data: u });
    setShowSummary(false);
  };

  const handleSelectGroup = (g) => {
    setSelectedChat({ type: "group", data: g });
    setShowSummary(false);
  };

  const handleGroupCreated = (group) => {
    setGroups((prev) => [...prev, group]);
    if (socket) socket.emit("joinGroupRooms", [group._id]);
  };

  // Creates a free Google Meet link via the current user's own Google Calendar,
  // then drops it into the chat as a normal message — so it's delivered,
  // persisted, and pushed to offline members exactly like any other message,
  // with zero extra plumbing.
  const startMeet = async () => {
    if (!selectedChat) return;
    setMeetLoading(true);

    // Open the tab SYNCHRONOUSLY, right on the click, before any `await`.
    // Browsers only allow window.open() during a direct user gesture — once
    // we've awaited a network request, that permission has expired and the
    // popup gets silently blocked (no error, no tab, nothing visible at all).
    // So we open a blank tab now and point it at the real URL once we have it.
    const meetTab = window.open("about:blank", "_blank");
    if (meetTab) {
      meetTab.document.title = "Starting Google Meet...";
    }

    try {
      const body =
        selectedChat.type === "direct"
          ? { peerId: selectedChat.data._id }
          : { groupId: selectedChat.data._id };
      const res = await api.post("/meet/create", body);
      handleSend({ text: `📹 Google Meet call started: ${res.data.url}` });
      if (meetTab) {
        meetTab.location.href = res.data.url;
      } else {
        // Their browser blocked even the blank tab (rare, aggressive blockers).
        showToast("Meet link created — your browser blocked the popup. It's in the chat, tap it to join.", "info", 7000);
      }
    } catch (err) {
      console.error("Google Meet creation failed:", err.response?.data || err.message);
      if (meetTab) meetTab.close();
      showToast(
        err.response?.data?.message || "Couldn't start a Google Meet call. Check the browser console for details.",
        "error",
        7000
      );
    } finally {
      setMeetLoading(false);
    }
  };

  const editMessage = (messageId, text) => {
    if (!socket) return;
    socket.emit("editMessage", { messageId, text });
  };

  const exitGroup = async () => {
    if (!selectedChat || selectedChat.type !== "group") return;
    const groupId = selectedChat.data._id;
    if (!window.confirm(`Leave "${selectedChat.data.name}"? You'll need a new invite to rejoin.`)) return;
    try {
      await api.delete(`/groups/${groupId}/leave`);
      socket?.emit("leaveGroupRoom", { groupId });
      setGroups((prev) => prev.filter((g) => g._id !== groupId));
      setSelectedChat(null);
      showToast("You left the group.", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Couldn't leave the group.", "error");
    }
  };

  return (
    <div className="app-shell fixed inset-0 flex overflow-hidden bg-midnight-950">
      {!connected && (
        <div className="absolute top-0 left-0 right-0 z-30 bg-amber-500 text-midnight-950 text-xs font-medium text-center py-1.5">
          Reconnecting to the server...
        </div>
      )}
      <Sidebar
        selectedChat={selectedChat}
        onSelectDirect={handleSelectDirect}
        onSelectGroup={handleSelectGroup}
        onOpenRequests={() => setShowRequests(true)}
        onOpenCreateGroup={() => setShowCreateGroup(true)}
        onOpenVoiceAssistant={() => setShowVoiceAssistant(true)}
        groups={groups}
      />

      <div className={`flex-1 relative flex-col min-w-0 min-h-0 ${selectedChat ? "flex" : "hidden md:flex"}`}>
        {selectedChat ? (
          <>
            <ChatWindow
              messages={messages}
              currentUserId={user.id}
              otherUser={selectedChat.data}
              isGroup={selectedChat.type === "group"}
              typing={typingUsers[selectedChat.data._id]}
              onOpenSummary={() => setShowSummary(true)}
              onStartMeet={startMeet}
              meetLoading={meetLoading}
              onAddMembers={() => setShowAddMembers(true)}
              onExitGroup={exitGroup}
              onEditMessage={editMessage}
              onBack={() => setSelectedChat(null)}
            />
            <MessageInput
              onSend={handleSend}
              onTyping={handleTypingStart}
              onStopTyping={handleTypingStop}
              onOpenSchedule={() => setShowSchedule(true)}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <div className="h-14 w-14 rounded-2xl bg-signal-500/15 flex items-center justify-center mb-4">
              <MessageCircle size={24} className="text-signal-400" />
            </div>
            <h2 className="font-display text-lg font-semibold text-white mb-1">
              Pick someone to talk to
            </h2>
            <p className="text-sm text-mist/50 max-w-xs">
              Select a friend or group from the left, or send a chat request to get started.
            </p>
          </div>
        )}

        {showSchedule && selectedChat?.type === "direct" && (
          <ScheduleModal
            receiverId={selectedChat.data._id}
            onClose={() => setShowSchedule(false)}
            onScheduled={() => {}}
          />
        )}

        {showSummary && selectedChat && (
          <SummaryPanel
            otherUserId={selectedChat.type === "direct" ? selectedChat.data._id : undefined}
            groupId={selectedChat.type === "group" ? selectedChat.data._id : undefined}
            onClose={() => setShowSummary(false)}
          />
        )}

        {showAddMembers && selectedChat?.type === "group" && (
          <AddMembersModal
            group={selectedChat.data}
            onClose={() => setShowAddMembers(false)}
            onInvited={() => showToast("Invites sent!", "success")}
          />
        )}
      </div>

      {showRequests && (
        <FriendRequests
          onClose={() => setShowRequests(false)}
          autoLoadGoogleContacts={autoLoadGoogleContacts}
        />
      )}
      {showCreateGroup && (
        <CreateGroupModal onClose={() => setShowCreateGroup(false)} onCreated={handleGroupCreated} />
      )}
      {showVoiceAssistant && botUser && (
        <VoiceAssistant
          socket={socket}
          botUser={botUser}
          onClose={() => setShowVoiceAssistant(false)}
        />
      )}

    </div>
  );
}
