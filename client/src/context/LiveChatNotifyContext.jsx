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

// A ringing-phone style repeating tone for a visitor waiting for a live agent —
// louder and kept ringing until the request is accepted (or the visitor leaves).
function playWaitingRing() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    [700, 900].forEach((freq, i) => {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = "sine"; osc.frequency.value = freq;
      osc.connect(gain); gain.connect(ctx.destination);
      const start = ctx.currentTime + i * 0.15;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.45, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.15);
      osc.start(start); osc.stop(start + 0.16);
    });
  } catch (e) {}
}

// Mounted once for the whole logged-in app (not just the Inbox/LiveChat page) so an
// agent gets notified of a new visitor message, or a new "talk to a live agent"
// request, no matter which dashboard page — or which browser tab — they're on.
export function LiveChatNotifyProvider({ children }) {
  const { businessId, user } = useAuth();
  const [unreadChatIds, setUnreadChatIds] = useState(() => new Set());
  const [waitingChatIds, setWaitingChatIds] = useState(() => new Set());
  const activeChatRef = useRef(null);
  const waitingRingIntervalRef = useRef(null);
  const notifiedWaitingIdsRef = useRef(new Set());

  const refreshWaitingList = async () => {
    try {
      const res = await api.get(`/livechat/business/${businessId}?status=waiting`);
      const ids = new Set(res.data.map((c) => c._id));
      setWaitingChatIds(ids);
      // stop tracking "already notified" for chats that are no longer waiting
      // (accepted / closed), so if the same id ever reappears we'd alert again.
      for (const id of Array.from(notifiedWaitingIdsRef.current)) {
        if (!ids.has(id)) notifiedWaitingIdsRef.current.delete(id);
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (!businessId || !user) return;

    if (window.Notification && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    refreshWaitingList();

    const socket = io(API_ROOT);
    socket.emit("join_business", businessId);

    socket.on("refresh", refreshWaitingList);

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
          silent: true,
        });
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      }
    });

    socket.on("new_waiting_chat", (payload) => {
      setWaitingChatIds((prev) => {
        if (prev.has(payload.chatId)) return prev;
        const next = new Set(prev);
        next.add(payload.chatId);
        return next;
      });

      if (notifiedWaitingIdsRef.current.has(payload.chatId)) return;
      notifiedWaitingIdsRef.current.add(payload.chatId);

      if (window.Notification && Notification.permission === "granted") {
        const notif = new Notification("Live chat request", {
          body: `${payload.visitorName || "A visitor"} wants to talk to a live agent.`,
          tag: `mf-waiting-${payload.chatId}`,
          silent: true,
        });
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      }
    });

    return () => socket.disconnect();
  }, [businessId, user]);

  // Keep ringing on a loop for as long as ANY chat is waiting, from anywhere in the
  // app — and stop the instant the server confirms nothing is waiting anymore
  // (accepted, closed, or the visitor left), instead of relying on local page state.
  useEffect(() => {
    if (waitingChatIds.size > 0) {
      if (!waitingRingIntervalRef.current) {
        playWaitingRing();
        waitingRingIntervalRef.current = setInterval(playWaitingRing, 2500);
      }
    } else if (waitingRingIntervalRef.current) {
      clearInterval(waitingRingIntervalRef.current);
      waitingRingIntervalRef.current = null;
    }
    return () => {
      if (waitingChatIds.size === 0 && waitingRingIntervalRef.current) {
        clearInterval(waitingRingIntervalRef.current);
        waitingRingIntervalRef.current = null;
      }
    };
  }, [waitingChatIds]);

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
      value={{
        unreadCount: unreadChatIds.size,
        unreadChatIds,
        waitingCount: waitingChatIds.size,
        setActiveChat,
        clearUnread,
        refreshWaitingList,
      }}
    >
      {children}
    </LiveChatNotifyContext.Provider>
  );
}

export function useLiveChatNotify() {
  return useContext(LiveChatNotifyContext);
}
