/**
 * Facebook-style notification bell — shared by user dashboard + admin console.
 * Persists inbox in localStorage; listens to chat / trade socket events.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  MessageSquare,
  TrendingUp,
  Trophy,
  Skull,
  CheckCheck,
  Trash2,
  X,
} from "lucide-react";
import { getSocket, onSocketEvent } from "../lib/socket.js";
import {
  clearNotifications,
  loadNotifications,
  markAllRead,
  markRead,
  pushNotification,
  timeAgo,
  unreadCount,
} from "../lib/notifications.js";

function previewText(text, max = 100) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function iconFor(type) {
  if (type === "chat") return MessageSquare;
  if (type === "trade_open") return TrendingUp;
  if (type === "trade_win") return Trophy;
  if (type === "trade_loss") return Skull;
  return Bell;
}

function toneFor(type) {
  if (type === "trade_win") return "text-emerald-300 bg-emerald-500/15";
  if (type === "trade_loss") return "text-rose-300 bg-rose-500/15";
  if (type === "trade_open") return "text-amber-300 bg-amber-500/15";
  if (type === "chat") return "text-cyan-300 bg-cyan-500/15";
  return "text-slate-300 bg-white/5";
}

/**
 * @param {"user"|"staff"} mode
 * @param {(n: object) => void} [onSelect]
 */
export default function NotificationBell({
  userId,
  mode = "user",
  onSelect,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(() => loadNotifications(userId));
  const panelRef = useRef(null);
  const uid = userId ? String(userId) : null;

  const refresh = useCallback(() => {
    if (!uid) return;
    setItems(loadNotifications(uid));
  }, [uid]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = useCallback(
    (entry) => {
      if (!uid) return;
      const next = pushNotification(uid, entry);
      setItems(next);
    },
    [uid]
  );

  // Socket → inbox
  useEffect(() => {
    if (!uid) return;
    getSocket();

    const offChat = onSocketEvent("chat:message", (payload) => {
      const msg = payload?.message;
      if (!msg?._id) return;

      if (mode === "staff") {
        if (msg.from !== "user") return;
        const name =
          payload?.user?.fullName ||
          payload?.user?.username ||
          payload?.user?.email ||
          "Client";
        const body = msg.attachmentUrl
          ? "Sent an image"
          : previewText(msg.body) || "Sent a message";
        add({
          id: `chat-${msg._id}`,
          type: "chat",
          title: `Message from ${name}`,
          body,
          createdAt: msg.createdAt || new Date().toISOString(),
          meta: {
            kind: "chat",
            userId: payload.userId,
            messageId: String(msg._id),
          },
        });
        return;
      }

      // user mode — admin / system replies only
      if (msg.from !== "admin" && msg.from !== "system") return;
      if (payload.userId && String(payload.userId) !== uid) return;
      const body = msg.attachmentUrl
        ? "Support sent an image"
        : previewText(msg.body) || "New support message";
      add({
        id: `chat-${msg._id}`,
        type: "chat",
        title: "Support message",
        body,
        createdAt: msg.createdAt || new Date().toISOString(),
        meta: { kind: "chat", messageId: String(msg._id) },
      });
    });

    const offTradeOpen = onSocketEvent("trade:opened", (payload) => {
      if (mode !== "staff") return;
      const t = payload?.trade;
      if (!t?._id) return;
      const name =
        payload?.user?.fullName ||
        payload?.user?.username ||
        payload?.user?.email ||
        "Client";
      const dir =
        String(t.direction || "").toLowerCase() === "short" ? "SHORT" : "LONG";
      const stake = Number(t.stake || 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      add({
        id: `trade-open-${t._id}`,
        type: "trade_open",
        title: `${name} opened a trade`,
        body: `${t.asset || "?"} ${dir} · $${stake}${
          t.durationSec ? ` · ${t.durationSec}s` : ""
        }`,
        createdAt: t.openedAt || new Date().toISOString(),
        meta: {
          kind: "trade_open",
          userId: payload.userId || t.user,
          tradeId: String(t._id),
        },
      });
    });

    const offTradeSettled = onSocketEvent("trade:settled", (payload) => {
      if (mode !== "user") return;
      const t = payload?.trade;
      if (!t?._id) return;
      if (payload.userId && String(payload.userId) !== uid) return;
      const status = String(t.status || "").toLowerCase();
      const won = status === "won" || status === "win";
      const lost = status === "lost" || status === "loss" || status === "lose";
      if (!won && !lost) return;
      if (won) {
        const stake = Number(t.stake || 0);
        const payout = Number(t.payout || 0);
        const profit = Math.max(0, payout - stake);
        const amount = (profit > 0 ? profit : payout).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        add({
          id: `trade-settle-${t._id}`,
          type: "trade_win",
          title: "Trade won",
          body: `${t.asset || "Trade"} · +$${amount}`,
          createdAt: t.settledAt || new Date().toISOString(),
          meta: { kind: "trade_settle", tradeId: String(t._id) },
        });
      } else {
        const loss = Number(t.lossAmount ?? t.stake ?? 0).toLocaleString(
          undefined,
          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        );
        add({
          id: `trade-settle-${t._id}`,
          type: "trade_loss",
          title: "Trade lost",
          body: `${t.asset || "Trade"} · −$${loss}`,
          createdAt: t.settledAt || new Date().toISOString(),
          meta: { kind: "trade_settle", tradeId: String(t._id) },
        });
      }
    });

    return () => {
      offChat();
      offTradeOpen();
      offTradeSettled();
    };
  }, [uid, mode, add]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const unread = unreadCount(items);

  const handleOpen = () => {
    setOpen((v) => !v);
  };

  const handleMarkAll = () => {
    if (!uid) return;
    setItems(markAllRead(uid));
  };

  const handleClear = () => {
    if (!uid) return;
    setItems(clearNotifications(uid));
  };

  const handleClickItem = (n) => {
    if (!uid || !n) return;
    setItems(markRead(uid, n.id));
    onSelect?.(n);
    setOpen(false);
  };

  if (!uid) return null;

  return (
    <div className={`relative ${className}`} ref={panelRef}>
      <button
        type="button"
        onClick={handleOpen}
        className="relative grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-200 transition hover:bg-white/[0.07] hover:text-white"
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid min-h-[18px] min-w-[18px] place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-lg shadow-rose-500/40">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 z-50 mt-2 w-[min(100vw-1.5rem,22rem)] overflow-hidden rounded-2xl border border-white/10 bg-[#0c1222] shadow-2xl shadow-black/50"
          >
            <div className="flex items-center justify-between gap-2 border-b border-white/5 px-3 py-2.5">
              <div>
                <div className="text-sm font-semibold text-white">
                  Notifications
                </div>
                <div className="text-[10px] text-slate-500">
                  {unread > 0 ? `${unread} unread` : "You're all caught up"}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleMarkAll}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-cyan-300"
                  title="Mark all read"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-rose-300"
                  title="Clear all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white md:hidden"
                  title="Close"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="max-h-[min(70vh,24rem)] overflow-y-auto">
              {items.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <Bell className="mx-auto mb-2 h-8 w-8 text-slate-600" />
                  <div className="text-sm text-slate-400">No notifications yet</div>
                  <div className="mt-1 text-[11px] text-slate-600">
                    Chat and trade alerts will show up here
                  </div>
                </div>
              ) : (
                <ul className="divide-y divide-white/5">
                  {items.map((n) => {
                    const Icon = iconFor(n.type);
                    return (
                      <li key={n.id}>
                        <button
                          type="button"
                          onClick={() => handleClickItem(n)}
                          className={`flex w-full gap-2.5 px-3 py-3 text-left transition hover:bg-white/[0.04] ${
                            n.read ? "opacity-70" : "bg-cyan-500/[0.04]"
                          }`}
                        >
                          <div
                            className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl ${toneFor(
                              n.type
                            )}`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="truncate text-xs font-semibold text-white">
                                {n.title}
                              </div>
                              {!n.read && (
                                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                              )}
                            </div>
                            {n.body ? (
                              <div className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-400">
                                {n.body}
                              </div>
                            ) : null}
                            <div className="mt-1 text-[10px] text-slate-600">
                              {timeAgo(n.createdAt)}
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
