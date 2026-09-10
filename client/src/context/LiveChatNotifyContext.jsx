import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";
import api from "../api/axios";

const API_ROOT = (api.defaults.baseURL || "").replace(/\/api\/?$/, "");
const LiveChatNotifyContext = createContext();

// Louder, more attention-grabbing alert for an incoming visitor message the
// agent isn't actively looking at right now (different chat, different page, or a
// different browser tab/app entirely).
function playLoudAlert() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    [880, 660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = "square"; osc.frequency.value = freq;
      osc.connect(gain); gain.connect(ctx.destination);
      const start = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.5, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
      osc.start(start); osc.stop(start + 0.19);
    });
  } catch (e) {}
}

// Mounted once for the whole logged-in app (not just the Inbox/LiveChat page) so an
// agent gets notified of a new visitor message no matter which dashboard page — or
// which browser tab — they're currently on.
export function LiveChatNotifyProvider({ children }) {
  const { businessId, user } = useAuth();
  const [unreadChatIds, setUnreadChatIds] = useState(() => new Set());
  const activeChatRef = useRef(null);

  useEffect(() => {
    if (!businessId || !user) return;

    if (window.Notification && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    const socket = io(API_ROOT);
    socket.emit("join_business", businessId);

    socket.on("visitor_message", (payload) => {
      const isViewingThisChat = activeChatRef.current === payload.chatId;
      const isTabVisible = document.visibilityState === "visible";
      if (isViewingThisChat && isTabVisible) return;

      setUnreadChatIds((prev) => {
        if (prev.has(payload.chatId)) return prev;
        const next = new Set(prev);
        next.add(payload.chatId);
        return next;
      });

      playLoudAlert();
      if (window.Notification && Notification.permission === "granted") {
        const notif = new Notification(`New message from ${payload.visitorName || "a visitor"}`, {
          body: payload.text,
          tag: `mf-livechat-${payload.chatId}`,
        });
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      }
    });

    return () => socket.disconnect();
  }, [businessId, user]);

  const setActiveChat = (chatId) => {
    activeChatRef.current = chatId;
  };

  const clearUnread = (chatId) => {
    setUnreadChatIds((prev) => {
      if (!prev.has(chatId)) return prev;
      const next = new Set(prev);
      next.delete(chatId);
      return next;
    });
  };

  return (
    <LiveChatNotifyContext.Provider
      value={{ unreadCount: unreadChatIds.size, unreadChatIds, setActiveChat, clearUnread }}
    >
      {children}
    </LiveChatNotifyContext.Provider>
  );
}

export function useLiveChatNotify() {
  return useContext(LiveChatNotifyContext);
}
