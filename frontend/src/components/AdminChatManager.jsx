/**
 * Admin Support Chat — two-way images + deposit Approve / Decline action hub.
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
  CheckCircle2,
  XCircle,
} from "lucide-react";

import { AdminAPI, ChatAPI, assetUrl } from "../lib/api.js";
import { getSocket, onSocketEvent } from "../lib/socket.js";

const POLL_MS = 8000;

const timeAgo = (iso) => {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(iso).toLocaleDateString();
};

const isPlaceholderMedia = (m) => {
  const hay = `${m?.attachmentUrl || ""} ${m?.body || ""}`;
  return /delta.?force|unsplash|picsum|placeholder|combat|banner/i.test(hay);
};

const mergeMessages = (prev, incoming) => {
  if (!incoming) return prev;
  const list = Array.isArray(incoming) ? incoming : [incoming];
  const map = new Map();
  for (const m of prev) {
    if (m?._id) map.set(String(m._id), m);
  }
  for (const m of list) {
    if (!m?._id || isPlaceholderMedia(m)) continue;
    map.set(String(m._id), m);
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
  );
};

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });

function DepositActions({
  transactionId,
  amount,
  symbol,
  busy,
  onApprove,
  onDecline,
  compact = false,
}) {
  if (!transactionId) return null;
  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${
        compact ? "mt-2" : ""
      }`}
    >
      {!compact && (
        <div className="mr-auto text-[11px] text-slate-400">
          Pending deposit
          {amount != null
            ? ` · $${Number(amount).toFixed(2)} ${symbol || "USDT"}`
            : ""}
        </div>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={() => onApprove(transactionId)}
        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-[11px] font-bold text-emerald-950 shadow-sm shadow-emerald-500/30 disabled:opacity-50"
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        Approve Deposit
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => onDecline(transactionId)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-400/50 bg-rose-500/15 px-3 py-2 text-[11px] font-bold text-rose-200 disabled:opacity-50"
      >
        <XCircle className="h-3.5 w-3.5" />
        Decline Deposit
      </button>
    </div>
  );
}

function MessageBubble({ m, busy, onApprove, onDecline, reviewedIds }) {
  const isAdmin = m.from === "admin";
  const txId = m?.meta?.transactionId;
  const isProof =
    m.messageType === "deposit_proof" ||
    (txId && m.attachmentUrl && m.from === "user");
  const alreadyReviewed = txId && reviewedIds.has(String(txId));

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
        {m.attachmentUrl && !isPlaceholderMedia(m) && (
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
        {isProof && txId && !alreadyReviewed && (
          <DepositActions
            compact
            transactionId={txId}
            amount={m.meta?.amount}
            symbol={m.meta?.symbol}
            busy={busy}
            onApprove={onApprove}
            onDecline={onDecline}
          />
        )}
        {isProof && alreadyReviewed && (
          <div className="mt-2 text-[10px] uppercase tracking-wider text-slate-400">
            Deposit already reviewed
          </div>
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
  const [verifying, setVerifying] = useState(false);
  const [actionBanner, setActionBanner] = useState(null);
  const [reviewedIds, setReviewedIds] = useState(() => new Set());
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
    getSocket();
    const id = setInterval(loadThreads, POLL_MS);
    return () => clearInterval(id);
  }, []);

  const loadHistory = async (userId) => {
    if (!userId) return;
    setHistoryLoading(true);
    try {
      const res = await ChatAPI.history(userId);
      const list = (res.messages || []).filter((m) => !isPlaceholderMedia(m));
      setMessages(list);
      const done = new Set();
      for (const m of list) {
        if (
          m.messageType === "system" &&
          m.meta?.kind === "deposit_review" &&
          m.meta?.transactionId
        ) {
          done.add(String(m.meta.transactionId));
        }
      }
      setReviewedIds(done);
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
    getSocket();
    const offMsg = onSocketEvent("chat:message", (payload) => {
      if (!payload?.message) return;
      loadThreads();
      if (
        selected?._id &&
        String(payload.userId) === String(selected._id)
      ) {
        setMessages((prev) => mergeMessages(prev, payload.message));
        if (
          payload.message?.meta?.kind === "deposit_review" &&
          payload.message?.meta?.transactionId
        ) {
          setReviewedIds((prev) => {
            const next = new Set(prev);
            next.add(String(payload.message.meta.transactionId));
            return next;
          });
        }
      }
    });
    return () => offMsg();
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

  const latestPendingDeposit = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const m = messages[i];
      const txId = m?.meta?.transactionId;
      if (
        txId &&
        (m.messageType === "deposit_proof" || m.attachmentUrl) &&
        m.from === "user" &&
        !reviewedIds.has(String(txId))
      ) {
        return {
          transactionId: String(txId),
          amount: m.meta?.amount,
          symbol: m.meta?.symbol || "USDT",
        };
      }
    }
    return null;
  }, [messages, reviewedIds]);

  const handleSend = async (e) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !selected || sending) return;
    setSending(true);
    try {
      const res = await ChatAPI.send({ body, userId: selected._id });
      setMessages((prev) => mergeMessages(prev, res.message));
      setDraft("");
      loadThreads();
    } catch (err) {
      setActionBanner(err?.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  const handleImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !selected || sending) return;
    if (!file.type?.startsWith("image/")) {
      setActionBanner("Only image files can be attached.");
      return;
    }
    setSending(true);
    setActionBanner(null);
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("userId", selected._id);
      if (draft.trim()) fd.append("body", draft.trim());
      let res;
      try {
        res = await ChatAPI.uploadImage(fd);
      } catch {
        const dataUrl = await fileToDataUrl(file);
        res = await ChatAPI.uploadImageBase64({
          image: dataUrl,
          userId: selected._id,
          body: draft.trim() || undefined,
        });
      }
      if (res?.message) {
        setMessages((prev) => mergeMessages(prev, res.message));
        setDraft("");
        loadThreads();
      }
    } catch (err) {
      setActionBanner(err?.message || "Image upload failed.");
    } finally {
      setSending(false);
    }
  };

  const sendDepositDetails = async () => {
    if (!selected || sending) return;
    setSending(true);
    try {
      const res = await ChatAPI.depositDetails({ userId: selected._id });
      setMessages((prev) => mergeMessages(prev, res.message));
    } catch (err) {
      setActionBanner(err?.message || "Could not send deposit details.");
    } finally {
      setSending(false);
    }
  };

  const reviewDeposit = async (transactionId, action) => {
    if (!transactionId || verifying) return;
    setVerifying(true);
    setActionBanner(null);
    try {
      const res = await AdminAPI.verifyTransaction(transactionId, { action });
      setReviewedIds((prev) => {
        const next = new Set(prev);
        next.add(String(transactionId));
        return next;
      });
      setActionBanner(
        action === "approve"
          ? `Deposit approved — Trading Wallet credited${
              res.wallet?.USDT != null
                ? ` (USDT ${Number(res.wallet.USDT).toFixed(2)})`
                : ""
            }.`
          : "Deposit marked REJECTED — balances unchanged."
      );
      if (selected?._id) await loadHistory(selected._id);
      loadThreads();
    } catch (err) {
      setActionBanner(err?.message || "Could not update deposit status.");
    } finally {
      setVerifying(false);
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
                        <div className="flex min-w-0 items-center gap-1.5">
                          <div className="truncate text-xs font-semibold">
                            {t.user?.fullName}
                          </div>
                          {t.user?.deletedAt && (
                            <span className="shrink-0 rounded border border-amber-400/30 bg-amber-500/15 px-1 text-[8px] font-semibold uppercase text-amber-200">
                              Archived
                            </span>
                          )}
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
                    {selected.deletedAt ? " · Archived (kept for Super Admin)" : ""}
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

            {/* Persistent deposit action hub */}
            <div className="border-b border-white/5 bg-black/25 px-4 py-2.5">
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Deposit verification controls
              </div>
              {latestPendingDeposit ? (
                <DepositActions
                  transactionId={latestPendingDeposit.transactionId}
                  amount={latestPendingDeposit.amount}
                  symbol={latestPendingDeposit.symbol}
                  busy={verifying}
                  onApprove={(id) => reviewDeposit(id, "approve")}
                  onDecline={(id) => reviewDeposit(id, "reject")}
                />
              ) : (
                <div className="text-[11px] text-slate-500">
                  No pending settlement receipt in this thread.
                </div>
              )}
              {actionBanner && (
                <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11px] text-slate-300">
                  {actionBanner}
                </div>
              )}
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
                  <MessageBubble
                    key={m._id}
                    m={m}
                    busy={verifying}
                    reviewedIds={reviewedIds}
                    onApprove={(id) => reviewDeposit(id, "approve")}
                    onDecline={(id) => reviewDeposit(id, "reject")}
                  />
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
