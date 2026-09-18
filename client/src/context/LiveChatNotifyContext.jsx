import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";
import api from "../api/axios";

const API_ROOT = (api.defaults.baseURL || "").replace(/\/api\/?$/, "");
const LiveChatNotifyContext = createContext();

// A single, reused AudioContext for the whole app. Creating a brand new one on
// every beep (the old approach) silently exhausts the browser's limited pool of
// concurrent audio contexts after a couple dozen rings — the sound would just
// stop firing for good, with the try/catch below hiding the failure. Reusing one
// context (and resuming it, since it can start/settle into "suspended") avoids that.
let sharedAudioCtx = null;
function getAudioContext() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
    sharedAudioCtx = new Ctx();
  }
  if (sharedAudioCtx.state === "suspended") {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

function playTones(freqs, { type, gap, dur, peak }) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = type; osc.frequency.value = freq;
      osc.connect(gain); gain.connect(ctx.destination);
      const start = ctx.currentTime + i * gap;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(peak, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.start(start); osc.stop(start + dur + 0.01);
    });
  } catch (e) {}
}

// Louder, more attention-grabbing alert for an incoming visitor message the
// agent isn't actively looking at right now (different chat, different page, or a
// different browser tab/app entirely).
function playLoudAlert() {
  playTones([880, 660, 880], { type: "square", gap: 0.18, dur: 0.18, peak: 0.5 });
}

// A ringing-phone style repeating tone for a visitor waiting for a live agent —
// sharp/urgent (square wave, near-max gain) so it actually cuts through, and
// kept ringing until the request is accepted (or the visitor leaves).
function playWaitingRing() {
  playTones([1050, 1050, 1350, 1350], { type: "square", gap: 0.13, dur: 0.12, peak: 0.75 });
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

  // Browsers can settle a freshly-created AudioContext into "suspended" until a
  // user gesture unlocks it, and switching tabs/apps is a good moment to make
  // sure it's still running so the ring doesn't go silent on a background tab.
  useEffect(() => {
    const unlock = () => getAudioContext();
    document.addEventListener("click", unlock);
    document.addEventListener("keydown", unlock);
    document.addEventListener("visibilitychange", unlock);
    return () => {
      document.removeEventListener("click", unlock);
      document.removeEventListener("keydown", unlock);
      document.removeEventListener("visibilitychange", unlock);
    };
  }, []);

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
