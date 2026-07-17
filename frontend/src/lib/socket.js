/**
 * Socket.IO client for live support chat + wallet header sync.
 */
import { io } from "socket.io-client";
import { BASE_URL, getToken } from "./api.js";

let socket = null;

const socketOrigin = () => BASE_URL.replace(/\/api\/?$/, "");

export function getSocket() {
  const token = getToken();
  if (!token) {
    disconnectSocket();
    return null;
  }

  if (socket?.connected) return socket;

  if (!socket) {
    socket = io(socketOrigin(), {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      autoConnect: false,
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 12,
      reconnectionDelay: 1200,
    });
  } else {
    socket.auth = { token };
  }

  if (!socket.connected) {
    socket.connect();
  }
  return socket;
}

export function disconnectSocket() {
  if (!socket) return;
  try {
    socket.removeAllListeners();
    socket.disconnect();
  } catch {
    /* ignore */
  }
  socket = null;
}

export function onSocketEvent(event, handler) {
  const s = getSocket();
  if (!s) return () => {};
  s.on(event, handler);
  return () => {
    try {
      s.off(event, handler);
    } catch {
      /* ignore */
    }
  };
}

export default { getSocket, disconnectSocket, onSocketEvent };
