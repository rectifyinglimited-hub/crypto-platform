/**
 * Live support chat.
 * Deposit / Withdrawal / Loan open those pages. Customer Service is chat only.
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  ArrowDownToLine,
  ArrowUpFromLine,
  Headphones,
  Upload,
  Landmark,
} from "lucide-react";

import { ChatAPI, assetUrl } from "../lib/api.js";
import { getSocket, onSocketEvent } from "../lib/socket.js";
import BrandLogo from "./BrandLogo.jsx";

const POLL_MS = 8000;
const OPEN_KEY = "nexus_chat_open";
const CHAT_STEPS = ["service"];

const AGENT_WAIT_NOTE =
  "Thank you for contacting Equiti Customer Service. An agent will attend to this chat within 5 to 10 minutes. Please keep this window open and type your request below.";

function isDepositDetailsMessage(m) {
  if (m?.meta?.kind === "deposit_details") return true;
  const body = String(m?.body || "");
  if (!body) return false;
  if (body.includes("Please review the official TRC-20 settlement address")) {
    return true;
  }
  return (
    body.includes("Secure Payment Verification Channel") &&
    body.includes("photographic transaction receipt")
  );
}

function isInjectedDeskCopy(m) {
  if (isDepositDetailsMessage(m)) return true;
  const body = String(m?.body || "");
  if (!body) return false;
  return (
    body.includes("VIP lounge request") ||
    body.includes("Information desk") ||
    body.includes("Loan desk") ||
    body.includes("Withdrawal desk") ||
    body.includes("You are in the live support thread") ||
    body.includes("equiti support — office") ||
    body.includes("equiti support desk") ||
    body.includes("Sign in so a manager can reply") ||
    body.includes("Then type your message below")
  );
}

const isSessionNote = (m) => {
  if (m?.meta?.kind === "chat_session_end") return true;
  const body = String(m?.body || "");
  return body.includes("Live chat ended") && body.includes("History is saved");
};

const formatRemain = (ms) => {
  const total = Math.max(0, Math.floor(Number(ms || 0) / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
};

const timeAgo = (iso) => {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(iso).toLocaleDateString();
};

const MENU_OPTIONS = [
  {
    key: "deposit",
    label: "Deposit",
    icon: ArrowDownToLine,
    tone: "from-emerald-500/20 to-emerald-400/5 text-emerald-200 ring-emerald-400/30",
  },
  {
    key: "withdraw",
    label: "Withdrawal",
    icon: ArrowUpFromLine,
    tone: "from-rose-500/20 to-rose-400/5 text-rose-200 ring-rose-400/30",
  },
  {
    key: "loan",
    label: "Loan",
    icon: Landmark,
    tone: "from-cyan-500/20 to-cyan-400/5 text-cyan-200 ring-cyan-400/30",
  },
  {
    key: "service",
    label: "Customer Service",
    icon: Headphones,
    tone: "from-indigo-500/20 to-indigo-400/5 text-indigo-200 ring-indigo-400/30",
  },
];

function localMsg(from, body) {
  return {
    _id: `local-${from}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    from,
    body,
    createdAt: new Date().toISOString(),
  };
}

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
    map.set(String(m._id), {
      ...m,
      attachmentUrl: isPlaceholderMedia(m) ? null : m.attachmentUrl,
    });
  }
  return Array.from(map.values())
    .filter(
      (m) =>
        !isDepositDetailsMessage(m) &&
        !isInjectedDeskCopy(m) &&
        !isSessionNote(m)
    )
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
};

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });

export default function LiveChatWidget({
  user,
  contextHint,
  openSignal = 0,
  onDepositSubmitted: _onDepositSubmitted,
  onWalletUpdate,
  onToast,
  onNeedAuth,
  onOpenDeposit,
  onOpenWithdraw,
  onOpenLoan,
  dockClass = "bottom-4",
}) {
  const userId = user?._id || user?.id;

  const [open, setOpen] = useState(() => {
    if (!user?._id && !user?.id) return false;
    try {
      return localStorage.getItem(OPEN_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [menuStep, setMenuStep] = useState("menu"); // menu | service | info | vip | loan
  const [statusBanner, setStatusBanner] = useState(null);
  const [session, setSession] = useState(null);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const listRef = useRef(null);
  const lastOpenSignal = useRef(0);
  const attachRef = useRef(null);
  const expireOnceRef = useRef(false);

  useEffect(() => {
    if (!openSignal || openSignal === lastOpenSignal.current) return;
    lastOpenSignal.current = openSignal;
    if (contextHint === "deposit") {
      if (onOpenDeposit) onOpenDeposit();
      else onNeedAuth?.();
      return;
    }
    if (contextHint === "withdraw") {
      if (onOpenWithdraw) onOpenWithdraw();
      else onNeedAuth?.();
      return;
    }
    if (contextHint === "loan") {
      if (onOpenLoan) onOpenLoan();
      else onNeedAuth?.();
      return;
    }
    setOpen(true);
    setDraft("");
    setStatusBanner(null);
    setMenuStep(contextHint === "service" ? "service" : "menu");
    if (userId && contextHint === "service") {
      ChatAPI.sessionStart()
        .then((res) => {
          if (res?.session) setSession(res.session);
        })
        .catch(() => {});
    }
  }, [openSignal, contextHint, onOpenDeposit, onOpenWithdraw, onOpenLoan, onNeedAuth, userId]);

  useEffect(() => {
    if (!userId) return;
    try {
      localStorage.setItem(OPEN_KEY, open ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [open, userId]);

  const load = async () => {
    if (!userId) return;
    try {
      const res = await ChatAPI.history(userId);
      const list = (res.messages || []).filter(
        (m) =>
          !isPlaceholderMedia(m) &&
          !isInjectedDeskCopy(m) &&
          !isSessionNote(m)
      );
      setMessages(list);
      if (res.session) {
        setSession(res.session);
        if (res.session.status === "open") {
          setMenuStep((prev) => (prev === "menu" ? "service" : prev));
        }
      }
    } catch {
      /* silent */
    }
  };

  useEffect(() => {
    if (!open || !userId) return;
    load();
    ChatAPI.markRead().catch(() => {});
    getSocket();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, userId]);

  // Live socket: new messages + deposit status
  useEffect(() => {
    if (!userId) return;
    getSocket();
    const offMsg = onSocketEvent("chat:message", (payload) => {
      if (!payload?.message) return;
      if (payload.userId && String(payload.userId) !== String(userId)) return;
      if (
        isPlaceholderMedia(payload.message) ||
        isInjectedDeskCopy(payload.message) ||
        isSessionNote(payload.message)
      ) {
        return;
      }
      setMessages((prev) => mergeMessages(prev, payload.message));
      if (open) ChatAPI.markRead().catch(() => {});
      // Popup when admin / support replies
      if (payload.message.from === "admin" || payload.message.from === "system") {
        const preview = payload.message.attachmentUrl
          ? "Support sent an image"
          : String(payload.message.body || "")
              .replace(/\s+/g, " ")
              .trim()
              .slice(0, 90);
        onToast?.(
          "success",
          preview ? `Support: ${preview}` : "New message from Support"
        );
      }
    });
    const offDeposit = onSocketEvent("deposit:status", (payload) => {
      if (payload?.userId && String(payload.userId) !== String(userId)) return;
      if (payload?.wallet) onWalletUpdate?.(payload.wallet);
      const status = String(payload?.status || "").toUpperCase();
      if (status === "APPROVED" || payload?.action === "approve") {
        setStatusBanner(
          `Deposit approved — $${Number(payload.amount || 0).toFixed(2)} credited to Trading Wallet.`
        );
      } else if (status === "REJECTED" || payload?.action === "reject") {
        setStatusBanner(
          "Deposit marked REJECTED. No balance change was applied."
        );
      }
    });
    const offWallet = onSocketEvent("wallet:update", (payload) => {
      if (payload?.userId && String(payload.userId) !== String(userId)) return;
      if (payload?.wallet) onWalletUpdate?.(payload.wallet);
    });
    const offSession = onSocketEvent("chat:session", (payload) => {
      if (payload?.userId && String(payload.userId) !== String(userId)) return;
      if (!payload?.session) return;
      setSession(payload.session);
      if (payload.session.status === "open") {
        setMenuStep((prev) => (prev === "menu" ? prev : "service"));
      }
    });
    return () => {
      offMsg();
      offDeposit();
      offWallet();
      offSession();
    };
  }, [userId, open, onWalletUpdate, onToast]);

  useEffect(() => {
    if (session?.status !== "open") {
      expireOnceRef.current = false;
      return undefined;
    }
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [session?.status, session?.expiresAt]);

  useEffect(() => {
    if (session?.status !== "open" || !session?.expiresAt) return undefined;
    const remain = new Date(session.expiresAt).getTime() - nowTick;
    if (remain > 0 || expireOnceRef.current) return undefined;
    expireOnceRef.current = true;
    load();
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nowTick, session?.status, session?.expiresAt]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight + 200;
  }, [messages.length, open, menuStep]);

  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (open || !userId) return;
    const check = async () => {
      try {
        const res = await ChatAPI.history(userId);
        const list = res.messages || [];
        setUnread(
          list.filter((m) => m.from === "admin" && !m.readByUser).length
        );
      } catch {
        /* ignore */
      }
    };
    check();
    const id = setInterval(check, POLL_MS * 2);
    return () => clearInterval(id);
  }, [open, userId]);

  const canChat = CHAT_STEPS.includes(menuStep);
  const sessionOpen = session?.status === "open";
  const sessionEnded = session?.status === "ended";
  const remainingMs = sessionOpen
    ? Math.max(0, new Date(session.expiresAt).getTime() - nowTick)
    : 0;
  const canCompose = Boolean(userId) || canChat;

  const beginSession = async () => {
    if (!userId) return null;
    try {
      const res = await ChatAPI.sessionStart();
      if (res?.session) setSession(res.session);
      return res?.session || null;
    } catch (err) {
      setStatusBanner(err?.message || "Could not start live chat.");
      return null;
    }
  };

  const selectMenu = async (key) => {
    setStatusBanner(null);
    if (key === "deposit") {
      if (onOpenDeposit) onOpenDeposit();
      else onNeedAuth?.();
      setOpen(false);
      setMenuStep("menu");
      return;
    }
    if (key === "withdraw") {
      if (onOpenWithdraw) onOpenWithdraw();
      else onNeedAuth?.();
      setOpen(false);
      setMenuStep("menu");
      return;
    }
    if (key === "loan") {
      if (onOpenLoan) onOpenLoan();
      else onNeedAuth?.();
      setOpen(false);
      setMenuStep("menu");
      return;
    }
    if (userId) await beginSession();
    setMenuStep(key);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending || !canCompose) return;
    setSending(true);
    if (!userId) {
      setMessages((prev) => mergeMessages(prev, localMsg("user", body)));
      setDraft("");
      setSending(false);
      return;
    }
    try {
      const res = await ChatAPI.send({ body });
      setMessages((prev) => mergeMessages(prev, res.message));
      if (res.session) setSession(res.session);
      setMenuStep("service");
      setDraft("");
    } catch (err) {
      if (err?.session) setSession(err.session);
      setStatusBanner(err?.message || "Message failed to send.");
    } finally {
      setSending(false);
    }
  };

  const handleAttachImage = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || sending || !canCompose) return;
    if (!userId) {
      onNeedAuth?.();
      setStatusBanner("Sign in to attach a receipt.");
      return;
    }
    if (!f.type?.startsWith("image/")) {
      setStatusBanner("Only image receipts are accepted.");
      return;
    }
    setSending(true);
    setStatusBanner(null);
    try {
      const fd = new FormData();
      fd.append("image", f);
      if (draft.trim()) fd.append("body", draft.trim());
      let res;
      try {
        res = await ChatAPI.uploadImage(fd);
      } catch {
        const dataUrl = await fileToDataUrl(f);
        res = await ChatAPI.uploadImageBase64({
          image: dataUrl,
          body: draft.trim() || undefined,
        });
      }
      if (res?.session) setSession(res.session);
      if (res?.message) {
        setMessages((prev) => mergeMessages(prev, res.message));
        setMenuStep("service");
        setDraft("");
      }
    } catch (err) {
      if (err?.session) setSession(err.session);
      setStatusBanner(err?.message || "Image upload failed. Try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={`pointer-events-none fixed right-3 z-50 flex flex-col items-end gap-3 sm:right-4 ${dockClass}`}>
      <AnimatePresence>
        {open && (
          <motion.div
            key="tray"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className="pointer-events-auto flex h-[min(560px,calc(100dvh-5.5rem))] w-[min(360px,calc(100vw-2rem))] max-w-[92vw] flex-col overflow-hidden rounded-2xl border border-white/5 bg-slate-900/90 shadow-2xl shadow-indigo-500/20 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between gap-2 border-b border-white/5 bg-gradient-to-r from-indigo-500/20 via-transparent to-emerald-400/20 px-3 py-3 sm:px-4">
              <div className="flex min-w-0 items-center gap-2">
                <BrandLogo variant="wordmark" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold leading-tight">
                    {menuStep === "service" ? "Customer Service" : "Live Chat"}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-400">
                    {sessionOpen
                      ? `Live · ${formatRemain(remainingMs)} left`
                      : sessionEnded
                        ? "Chat ended"
                        : "Online · Encrypted channel"}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {!userId && (
              <button
                type="button"
                onClick={() => onNeedAuth?.()}
                className="border-b border-[#00C2B3]/20 bg-[#00C2B3]/10 px-4 py-2 text-center text-[11px] font-semibold text-[#00C2B3] hover:bg-[#00C2B3]/15"
              >
                Sign in for a live manager reply
              </button>
            )}

            <div
              ref={listRef}
              className="flex-1 space-y-3 overflow-y-auto px-3 py-3"
            >
              {menuStep === "menu" && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="text-xs font-semibold text-slate-100">
                    How can we help?
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {userId
                      ? "Deposit, Withdrawal, and Loan open those pages. Customer Service is live chat only."
                      : "Sign in to open Deposit, Withdrawal, or Loan. Customer Service is available here."}
                  </p>
                  <div className="mt-3 grid gap-2">
                    {(userId
                      ? MENU_OPTIONS
                      : MENU_OPTIONS.filter((o) => o.key === "service")
                    ).map(({ key, label, icon: Icon, tone }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => selectMenu(key)}
                        className={`flex items-center gap-3 rounded-xl bg-gradient-to-r px-3 py-3 text-left text-sm font-semibold ring-1 ${tone}`}
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {menuStep === "service" && (
                <div className="space-y-2">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setMenuStep("menu")}
                      className="text-[10px] uppercase tracking-wider text-slate-500 hover:text-slate-300"
                    >
                      Menu
                    </button>
                  </div>
                  <div className="max-w-[92%] rounded-2xl border border-white/5 bg-white/[0.03] px-3 py-2 text-sm text-slate-200">
                    <p className="leading-relaxed">{AGENT_WAIT_NOTE}</p>
                  </div>
                </div>
              )}

              {statusBanner && (
                <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100">
                  {statusBanner}
                </div>
              )}

              {userId && sessionEnded && (
                <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-center text-[11px] font-semibold text-slate-300">
                  Chat ended
                </div>
              )}

              <AnimatePresence initial={false}>
                {messages.map((m) => {
                  const systemNote =
                    m.messageType === "system" && !isSessionNote(m);
                  return (
                    <motion.div
                      key={m._id}
                      layout
                      initial={{ opacity: 0, y: 12, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className={`flex ${
                        systemNote
                          ? "justify-center"
                          : m.from === "user"
                            ? "justify-end"
                            : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                          systemNote
                            ? "border border-white/10 bg-white/[0.04] text-center text-[11px] text-slate-400"
                            : m.from === "user"
                              ? "bg-gradient-to-br from-indigo-500 to-indigo-400 text-white"
                              : "border border-white/5 bg-white/[0.03] text-slate-200"
                        }`}
                      >
                        <div className="whitespace-pre-wrap break-words">
                          {m.body}
                        </div>
                        {m.attachmentUrl && !isPlaceholderMedia(m) && (
                          <a
                            href={assetUrl(m.attachmentUrl)}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 block overflow-hidden rounded-lg ring-1 ring-white/10"
                          >
                            <img
                              src={assetUrl(m.attachmentUrl)}
                              alt="Attachment"
                              className="max-h-40 w-full object-cover"
                            />
                          </a>
                        )}
                        <div
                          className={`mt-1 text-[10px] uppercase tracking-widest ${
                            systemNote
                              ? "text-slate-500"
                              : m.from === "user"
                                ? "text-indigo-100/70"
                                : "text-slate-500"
                          }`}
                        >
                          {timeAgo(m.createdAt)}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {canCompose ? (
            <form
              onSubmit={handleSend}
              className="flex items-center gap-2 border-t border-white/5 bg-black/20 px-3 py-2.5"
            >
              <input
                ref={attachRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAttachImage}
              />
              <button
                type="button"
                onClick={() => attachRef.current?.click()}
                disabled={sending}
                className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-slate-300 disabled:opacity-50"
                title="Attach receipt image"
              >
                <Upload className="h-4 w-4" />
              </button>
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
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) {
            setMenuStep(session?.status === "open" ? "service" : "menu");
          }
        }}
        whileTap={{ scale: 0.94 }}
        whileHover={{ scale: 1.03 }}
        className="pointer-events-auto relative grid h-12 w-12 place-items-center rounded-full bg-[#00C2B3] text-black shadow-2xl shadow-[#00C2B3]/40"
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
      </motion.button>
    </div>
  );
}
