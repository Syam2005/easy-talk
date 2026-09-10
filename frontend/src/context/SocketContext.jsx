import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { API_URL } from "./AuthContext.jsx";
import { useAuth } from "./AuthContext.jsx";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { token, user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState({}); // { userId: boolean }

  useEffect(() => {
    if (!token || !user) return;

    // Empty API_URL means "same origin" — pass undefined so socket.io-client
    // connects to wherever the page itself was loaded from.
    const socket = io(API_URL || undefined, {
      auth: { token },
      transports: ["websocket"],
    });

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("userStatusChanged", ({ userId, isOnline }) => {
      setOnlineStatus((prev) => ({ ...prev, [userId]: isOnline }));
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, user]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected, onlineStatus }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
