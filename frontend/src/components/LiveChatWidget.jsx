/**
 * =============================================================================
 *  NEXUS FRONTEND — src/components/LiveChatWidget.jsx
 * =============================================================================
 *  Floating chat bubble → glassmorphic message tray.
 *    • Polls /api/chat/history/:userId every 4s while open.
 *    • Auto-prompt banner slides up when the parent tells us the user is on
 *      the deposit context (Wallet tab).
 *    • Unread badge + typing-dots animation for arriving admin replies.
 * =============================================================================
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  X,
  Send,
  ShieldCheck,
  Loader2,
  ArrowDownToLine,
} from "lucide-react";

import { ChatAPI } from "../lib/api.js";

const POLL_MS = 4000;
const OPEN_KEY = "nexus_chat_open";
const DEPOSIT_PROMPT_DISMISS_KEY = "nexus_chat_deposit_prompt_dismissed_at";
const DEPOSIT_PROMPT_QUIET_MS = 60 * 60 * 1000; // 1h between prompts

const timeAgo = (iso) => {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(iso).toLocaleDateString();
};

const TypingDots = () => (
  <div className="flex items-center gap-1 rounded-2xl bg-white/[0.03] px-3 py-2 text-slate-400">
    <span className="text-[10px] uppercase tracking-widest">
      Support is typing
    </span>
    <span className="flex gap-0.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1 w-1 rounded-full bg-emerald-300"
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </span>
  </div>
);

export default function LiveChatWidget({
  user,
  contextHint,
  openSignal = 0,
}) {
  const userId = user?._id || user?.id;

  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(OPEN_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [showDepositPrompt, setShowDepositPrompt] = useState(false);
  const listRef = useRef(null);
  const lastCountRef = useRef(0);
  const lastOpenSignal = useRef(0);

  // External "Deposit" CTA → force-open support chat
  useEffect(() => {
    if (!openSignal || openSignal === lastOpenSignal.current) return;
    lastOpenSignal.current = openSignal;
    setOpen(true);
    setShowDepositPrompt(false);
    setDraft("Hi — I need help with my deposit. Please assist.");
  }, [openSignal]);

  useEffect(() => {
    try {
      localStorage.setItem(OPEN_KEY, open ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [open]);

  // -----------------------------------------------------------------
  // Deposit-context auto-prompt
  // -----------------------------------------------------------------
  useEffect(() => {
    if (contextHint !== "deposit") {
      setShowDepositPrompt(false);
      return;
    }
    let dismissedAt = 0;
    try {
      dismissedAt =
        Number(localStorage.getItem(DEPOSIT_PROMPT_DISMISS_KEY)) || 0;
    } catch {
      /* ignore */
    }
    if (Date.now() - dismissedAt < DEPOSIT_PROMPT_QUIET_MS) return;

    // Small delay so it doesn't jump the moment the tab loads.
    const t = setTimeout(() => setShowDepositPrompt(true), 900);
    return () => clearTimeout(t);
  }, [contextHint]);

  const dismissDepositPrompt = () => {
    setShowDepositPrompt(false);
    try {
      localStorage.setItem(
        DEPOSIT_PROMPT_DISMISS_KEY,
        String(Date.now())
      );
    } catch {
      /* ignore */
    }
  };

  const openFromDepositPrompt = () => {
    dismissDepositPrompt();
    setOpen(true);
    setDraft("Hi — I need help with my deposit.");
  };

  // -----------------------------------------------------------------
  // Load history
  // -----------------------------------------------------------------
  const load = async () => {
    if (!userId) return;
    try {
      const res = await ChatAPI.history(userId);
      const list = res.messages || [];
      const newAdmin = list.some(
        (m, i) => i >= lastCountRef.current && m.from === "admin"
      );
      if (newAdmin) {
        setTyping(true);
        setTimeout(() => {
          setTyping(false);
          setMessages(list);
          lastCountRef.current = list.length;
        }, 900);
      } else {
        setMessages(list);
        lastCountRef.current = list.length;
      }
    } catch {
      /* silent */
    }
  };

  useEffect(() => {
    if (!open || !userId) return;
    load();
    ChatAPI.markRead().catch(() => {});
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, userId]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight + 200;
  }, [messages.length, typing, open]);

  // Unread badge for closed widget
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (open || !userId) return;
    const check = async () => {
      try {
        const res = await ChatAPI.history(userId);
        const list = res.messages || [];
        const u = list.filter(
          (m) => m.from === "admin" && !m.readByUser
        ).length;
        setUnread(u);
      } catch {
        /* ignore */
      }
    };
    check();
    const id = setInterval(check, POLL_MS * 2);
    return () => clearInterval(id);
  }, [open, userId]);

  // -----------------------------------------------------------------
  // Send
  // -----------------------------------------------------------------
  const handleSend = async (e) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const res = await ChatAPI.send({ body });
      setMessages((prev) => [...prev, res.message]);
      lastCountRef.current += 1;
      setDraft("");
    } catch {
      /* silent */
    } finally {
      setSending(false);
    }
  };

  if (!userId) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
      {/* Deposit prompt bubble */}
      <AnimatePresence>
        {showDepositPrompt && !open && (
          <motion.div
            key="deposit-prompt"
            initial={{ opacity: 0, y: 20, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.94 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
            className="pointer-events-auto max-w-[300px] rounded-2xl border border-emerald-400/25 bg-slate-900/90 p-3.5 shadow-2xl shadow-emerald-500/25 backdrop-blur-xl"
          >
            <div className="mb-2 flex items-start gap-2">
              <div className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-500/15 text-emerald-300">
                <ArrowDownToLine className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-semibold text-slate-100">
                  Need help with your deposit?
                </div>
                <div className="mt-0.5 text-[11px] text-slate-400">
                  Send a message to online support — we usually reply in
                  minutes.
                </div>
              </div>
              <button
                onClick={dismissDepositPrompt}
                className="rounded p-0.5 text-slate-500 hover:bg-white/5 hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={openFromDepositPrompt}
              className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-3 py-1.5 text-[11px] font-semibold text-white shadow-lg shadow-emerald-500/25"
            >
              Chat with Support
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tray */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="tray"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className="pointer-events-auto flex h-[520px] w-[360px] max-w-[92vw] flex-col overflow-hidden rounded-2xl border border-white/5 bg-slate-900/80 shadow-2xl shadow-indigo-500/20 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between border-b border-white/5 bg-gradient-to-r from-indigo-500/20 via-transparent to-emerald-400/20 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-emerald-400 shadow-lg shadow-indigo-500/25">
                  <ShieldCheck className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Nexus Support</div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-400">
                    Live · Usually replies in minutes
                  </div>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {contextHint === "deposit" && (
              <div className="border-b border-emerald-400/15 bg-emerald-500/5 px-3 py-2 text-[11px] text-emerald-200">
                💡 You're on the deposit screen — describe your issue and we'll
                jump in.
              </div>
            )}

            <div
              ref={listRef}
              className="flex-1 space-y-2 overflow-y-auto px-3 py-3"
            >
              {messages.length === 0 && !typing && (
                <div className="mt-16 text-center text-xs text-slate-500">
                  Send a message to start the conversation.
                  <br />
                  Our team is standing by.
                </div>
              )}
              <AnimatePresence initial={false}>
                {messages.map((m) => (
                  <motion.div
                    key={m._id}
                    layout
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 320,
                      damping: 26,
                    }}
                    className={`flex ${
                      m.from === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                        m.from === "user"
                          ? "bg-gradient-to-br from-indigo-500 to-indigo-400 text-white"
                          : "border border-white/5 bg-white/[0.03] text-slate-200"
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words">
                        {m.body}
                      </div>
                      <div
                        className={`mt-1 text-[10px] uppercase tracking-widest ${
                          m.from === "user"
                            ? "text-indigo-100/70"
                            : "text-slate-500"
                        }`}
                      >
                        {timeAgo(m.createdAt)}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <AnimatePresence>
                {typing && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="flex justify-start"
                  >
                    <TypingDots />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <form
              onSubmit={handleSend}
              className="flex items-center gap-2 border-t border-white/5 bg-black/20 px-3 py-2.5"
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type a message…"
                className="flex-1 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600"
              />
              <motion.button
                type="submit"
                disabled={!draft.trim() || sending}
                whileTap={{ scale: 0.9 }}
                className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-400 text-white shadow-lg shadow-indigo-500/25 disabled:opacity-50"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </motion.button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileTap={{ scale: 0.94 }}
        whileHover={{ scale: 1.03 }}
        className="pointer-events-auto relative grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-emerald-400 text-white shadow-2xl shadow-indigo-500/40"
      >
        <MessageCircle className="h-5 w-5" />
        {!open && unread > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -right-1 -top-1 grid h-5 min-w-[20px] place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-lg"
          >
            {unread > 9 ? "9+" : unread}
          </motion.span>
        )}
        <motion.span
          className="pointer-events-none absolute inset-0 rounded-full border border-emerald-300/40"
          animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
        />
      </motion.button>
    </div>
  );
}
