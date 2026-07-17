/**
 * Admin Support Chat — shows images + admin can upload pics to users.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Loader2,
  Search,
  RefreshCw,
  User as UserIcon,
  Paperclip,
  Image as ImageIcon,
} from "lucide-react";

import { ChatAPI, assetUrl } from "../lib/api.js";

const POLL_MS = 4000;

const timeAgo = (iso) => {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(iso).toLocaleDateString();
};

function MessageBubble({ m }) {
  const isAdmin = m.from === "admin";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
          isAdmin
            ? "bg-gradient-to-br from-indigo-500 to-indigo-400 text-white"
            : "border border-white/5 bg-white/[0.03] text-slate-200"
        }`}
      >
        <div className="whitespace-pre-wrap break-words">{m.body}</div>
        {m.attachmentUrl && (
          <a
            href={assetUrl(m.attachmentUrl)}
            target="_blank"
            rel="noreferrer"
            className="mt-2 block overflow-hidden rounded-lg ring-1 ring-white/20"
          >
            <img
              src={assetUrl(m.attachmentUrl)}
              alt="Attachment"
              className="max-h-56 w-full object-contain bg-black/40"
            />
          </a>
        )}
        <div
          className={`mt-1 text-[10px] uppercase tracking-widest ${
            isAdmin ? "text-indigo-100/70" : "text-slate-500"
          }`}
        >
          {timeAgo(m.createdAt)}
        </div>
      </div>
    </motion.div>
  );
}

export default function AdminChatManager() {
  const [threads, setThreads] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [query, setQuery] = useState("");
  const listRef = useRef(null);
  const fileRef = useRef(null);

  const loadThreads = async () => {
    setThreadsLoading(true);
    try {
      const res = await ChatAPI.threads();
      setThreads(res.threads || []);
    } catch {
      /* ignore */
    } finally {
      setThreadsLoading(false);
    }
  };

  useEffect(() => {
    loadThreads();
    const id = setInterval(loadThreads, POLL_MS);
    return () => clearInterval(id);
  }, []);

  const loadHistory = async (userId) => {
    if (!userId) return;
    setHistoryLoading(true);
    try {
      const res = await ChatAPI.history(userId);
      setMessages(res.messages || []);
    } catch {
      /* ignore */
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (!selected) return;
    loadHistory(selected._id);
    ChatAPI.markRead({ userId: selected._id }).catch(() => {});
    const id = setInterval(() => loadHistory(selected._id), POLL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?._id]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight + 200;
  }, [messages.length]);

  const filteredThreads = useMemo(() => {
    if (!query.trim()) return threads;
    const q = query.toLowerCase();
    return threads.filter(
      (t) =>
        t.user?.fullName?.toLowerCase().includes(q) ||
        t.user?.username?.toLowerCase().includes(q) ||
        t.user?.email?.toLowerCase().includes(q)
    );
  }, [threads, query]);

  const handleSend = async (e) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !selected || sending) return;
    setSending(true);
    try {
      const res = await ChatAPI.send({ body, userId: selected._id });
      setMessages((prev) => [...prev, res.message]);
      setDraft("");
    } finally {
      setSending(false);
    }
  };

  const handleImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !selected || sending) return;
    setSending(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("userId", selected._id);
      if (draft.trim()) fd.append("body", draft.trim());
      const res = await ChatAPI.uploadImage(fd);
      setMessages((prev) => [...prev, res.message]);
      setDraft("");
      loadThreads();
    } catch {
      /* ignore */
    } finally {
      setSending(false);
    }
  };

  const sendDepositDetails = async () => {
    if (!selected || sending) return;
    setSending(true);
    try {
      const res = await ChatAPI.depositDetails({ userId: selected._id });
      setMessages((prev) => [...prev, res.message]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid h-[calc(100vh-14rem)] min-h-[540px] grid-cols-1 gap-4 md:grid-cols-3">
      <aside className="flex flex-col overflow-hidden rounded-2xl border border-white/5 bg-slate-900/60 backdrop-blur-sm md:col-span-1">
        <div className="border-b border-white/5 p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold tracking-tight">Inboxes</div>
            <button
              type="button"
              onClick={loadThreads}
              disabled={threadsLoading}
              className="flex items-center gap-1 rounded-lg border border-white/5 bg-white/[0.02] px-2 py-1 text-[10px] text-slate-300 hover:bg-white/[0.05] disabled:opacity-50"
            >
              {threadsLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              Refresh
            </button>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-2.5 py-1.5">
            <Search className="h-3.5 w-3.5 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users…"
              className="w-full bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-600"
            />
          </div>
        </div>
        <ul className="flex-1 divide-y divide-white/5 overflow-y-auto">
          <AnimatePresence initial={false}>
            {filteredThreads.map((t) => {
              const active = selected?._id === t._id;
              return (
                <motion.li
                  key={t._id}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  onClick={() => setSelected(t.user)}
                  className={`relative cursor-pointer px-4 py-3 transition ${
                    active ? "bg-white/[0.05]" : "hover:bg-white/[0.02]"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="thread-active"
                      className="absolute bottom-2 left-0 top-2 w-1 rounded-r bg-gradient-to-b from-indigo-500 to-emerald-400"
                    />
                  )}
                  <div className="flex items-start gap-2.5">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-emerald-400 text-[10px] font-bold text-white">
                      {t.user?.fullName
                        ?.split(/\s+/)
                        .slice(0, 2)
                        .map((s) => s[0])
                        .join("")
                        .toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate text-xs font-semibold">
                          {t.user?.fullName}
                        </div>
                        <div className="shrink-0 text-[9px] uppercase tracking-widest text-slate-500">
                          {timeAgo(t.lastMessage?.createdAt)}
                        </div>
                      </div>
                      <div className="truncate text-[11px] text-slate-500">
                        {t.lastMessage?.attachmentUrl ? "📷 " : ""}
                        {t.lastMessage?.from === "admin" ? "You: " : ""}
                        {t.lastMessage?.body}
                      </div>
                    </div>
                    {t.unread > 0 && (
                      <span className="grid h-4 min-w-[16px] place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                        {t.unread > 9 ? "9+" : t.unread}
                      </span>
                    )}
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
          {!threadsLoading && filteredThreads.length === 0 && (
            <li className="p-6 text-center text-xs text-slate-500">
              No conversations yet.
            </li>
          )}
        </ul>
      </aside>

      <section className="flex flex-col overflow-hidden rounded-2xl border border-white/5 bg-slate-900/60 backdrop-blur-sm md:col-span-2">
        {selected ? (
          <>
            <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-emerald-400 text-[11px] font-bold text-white">
                  {selected.fullName
                    ?.split(/\s+/)
                    .slice(0, 2)
                    .map((s) => s[0])
                    .join("")
                    .toUpperCase() || "?"}
                </div>
                <div>
                  <div className="text-sm font-semibold">
                    {selected.fullName}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-500">
                    @{selected.username} · {selected.email}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={sendDepositDetails}
                disabled={sending}
                className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1.5 text-[10px] font-semibold text-emerald-200 disabled:opacity-50"
              >
                Send deposit details
              </button>
            </div>
            <div
              ref={listRef}
              className="flex-1 space-y-2 overflow-y-auto px-4 py-3"
            >
              {historyLoading && messages.length === 0 && (
                <div className="mt-16 flex items-center justify-center gap-2 text-xs text-slate-500">
                  <Loader2 className="h-3 w-3 animate-spin" /> Loading history…
                </div>
              )}
              <AnimatePresence initial={false}>
                {messages.map((m) => (
                  <MessageBubble key={m._id} m={m} />
                ))}
              </AnimatePresence>
              {!historyLoading && messages.length === 0 && (
                <div className="mt-16 text-center text-xs text-slate-500">
                  No messages in this thread yet.
                </div>
              )}
            </div>
            <form
              onSubmit={handleSend}
              className="flex items-center gap-2 border-t border-white/5 bg-black/20 px-3 py-2.5"
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImage}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={sending}
                className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 disabled:opacity-50"
                title="Send image"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Reply as Nexus Support…"
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
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-slate-500">
            <UserIcon className="mb-3 h-8 w-8" />
            <div className="text-sm font-semibold">
              Select a conversation to begin
            </div>
            <div className="mt-1 flex items-center gap-1 text-xs">
              <ImageIcon className="h-3 w-3" /> Deposit proofs & admin pics show
              here
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
