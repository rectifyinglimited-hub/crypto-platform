/**
 * Live support chat with automated menu:
 *   Customer Service | Deposit | Information
 * Deposit flow shows admin TRC-20 address + screenshot proof upload.
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  X,
  Send,
  ShieldCheck,
  Loader2,
  ArrowDownToLine,
  Headphones,
  Info,
  Copy,
  Upload,
  Image as ImageIcon,
} from "lucide-react";

import {
  ChatAPI,
  GatewayAPI,
  WalletAPI,
  assetUrl,
} from "../lib/api.js";

const POLL_MS = 4000;
const OPEN_KEY = "nexus_chat_open";

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
    key: "service",
    label: "Customer Service",
    icon: Headphones,
    tone: "from-indigo-500/20 to-indigo-400/5 text-indigo-200 ring-indigo-400/30",
  },
  {
    key: "deposit",
    label: "Deposit",
    icon: ArrowDownToLine,
    tone: "from-emerald-500/20 to-emerald-400/5 text-emerald-200 ring-emerald-400/30",
  },
  {
    key: "info",
    label: "Information",
    icon: Info,
    tone: "from-cyan-500/20 to-cyan-400/5 text-cyan-200 ring-cyan-400/30",
  },
];

export default function LiveChatWidget({
  user,
  contextHint,
  openSignal = 0,
  onDepositSubmitted,
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
  const [menuStep, setMenuStep] = useState("menu"); // menu | service | deposit | info
  const [gateway, setGateway] = useState(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [submittingProof, setSubmittingProof] = useState(false);
  const [statusBanner, setStatusBanner] = useState(null);
  const listRef = useRef(null);
  const lastCountRef = useRef(0);
  const lastOpenSignal = useRef(0);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!openSignal || openSignal === lastOpenSignal.current) return;
    lastOpenSignal.current = openSignal;
    setOpen(true);
    setMenuStep("menu");
    setDraft("");
    setStatusBanner(null);
  }, [openSignal]);

  useEffect(() => {
    try {
      localStorage.setItem(OPEN_KEY, open ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (contextHint === "deposit") setMenuStep("menu");
  }, [open, contextHint]);

  const load = async () => {
    if (!userId) return;
    try {
      const res = await ChatAPI.history(userId);
      const list = res.messages || [];
      setMessages(list);
      lastCountRef.current = list.length;
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
  }, [messages.length, open, menuStep]);

  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (open || !userId) return;
    const check = async () => {
      try {
        const res = await ChatAPI.history(userId);
        const list = res.messages || [];
        setUnread(list.filter((m) => m.from === "admin" && !m.readByUser).length);
      } catch {
        /* ignore */
      }
    };
    check();
    const id = setInterval(check, POLL_MS * 2);
    return () => clearInterval(id);
  }, [open, userId]);

  const loadGateway = async () => {
    try {
      const res = await GatewayAPI.current();
      setGateway(res.settings || null);
    } catch {
      setGateway(null);
    }
  };

  const selectMenu = async (key) => {
    setMenuStep(key);
    setStatusBanner(null);
    if (key === "deposit") {
      await loadGateway();
    }
    if (key === "service" || key === "info") {
      const text =
        key === "service"
          ? "I'd like to speak with Customer Service."
          : "I need Information about the platform.";
      try {
        const res = await ChatAPI.send({ body: text });
        setMessages((prev) => [...prev, res.message]);
      } catch {
        /* ignore */
      }
    }
  };

  const copyDepositAddress = async () => {
    const addr = gateway?.usdtTrc20Address;
    if (!addr) return;
    try {
      await navigator.clipboard.writeText(addr);
      setStatusBanner("Deposit address copied.");
    } catch {
      setStatusBanner("Could not copy — select the address manually.");
    }
  };

  const onPickProof = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setProofFile(f);
    const url = URL.createObjectURL(f);
    setProofPreview(url);
  };

  const submitDepositProof = async () => {
    const amount = Number(depositAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setStatusBanner("Enter a valid deposit amount.");
      return;
    }
    if (!proofFile) {
      setStatusBanner("Upload a screenshot of your transfer.");
      return;
    }
    setSubmittingProof(true);
    setStatusBanner(null);
    try {
      const fd = new FormData();
      fd.append("amount", String(amount));
      fd.append("symbol", "USDT");
      fd.append("network", "TRC20");
      fd.append("proof", proofFile);
      const res = await WalletAPI.depositProof(fd);
      if (res.chatMessage) {
        setMessages((prev) => [...prev, res.chatMessage]);
      }
      setDepositAmount("");
      setProofFile(null);
      setProofPreview(null);
      setStatusBanner(
        "Pending Verification / Awaiting Admin Approval — wallet tops up after admin approve."
      );
      onDepositSubmitted?.(res.transaction);
      await load();
    } catch (err) {
      setStatusBanner(err?.message || "Upload failed. Try again.");
    } finally {
      setSubmittingProof(false);
    }
  };

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

  const depositAddr = gateway?.usdtTrc20Address;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 max-sm:bottom-20">
      <AnimatePresence>
        {open && (
          <motion.div
            key="tray"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className="pointer-events-auto flex h-[560px] w-[360px] max-w-[92vw] flex-col overflow-hidden rounded-2xl border border-white/5 bg-slate-900/90 shadow-2xl shadow-indigo-500/20 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between border-b border-white/5 bg-gradient-to-r from-indigo-500/20 via-transparent to-emerald-400/20 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-emerald-400 shadow-lg shadow-indigo-500/25">
                  <ShieldCheck className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Live Chat Support</div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-400">
                    Online · Secure channel
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div
              ref={listRef}
              className="flex-1 space-y-3 overflow-y-auto px-3 py-3"
            >
              {/* Automated selection menu */}
              {menuStep === "menu" && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="text-xs font-semibold text-slate-100">
                    How can we help?
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Choose an option to continue.
                  </p>
                  <div className="mt-3 grid gap-2">
                    {MENU_OPTIONS.map(({ key, label, icon: Icon, tone }) => (
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

              {menuStep === "deposit" && (
                <div className="space-y-3 rounded-2xl border border-emerald-400/25 bg-emerald-500/5 p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-emerald-200">
                      Deposit · USDT TRC-20
                    </div>
                    <button
                      type="button"
                      onClick={() => setMenuStep("menu")}
                      className="text-[10px] uppercase tracking-wider text-slate-500 hover:text-slate-300"
                    >
                      Menu
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Send USDT to the admin wallet below, then upload your
                    transfer screenshot for approval.
                  </p>
                  <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-slate-500">
                      Admin deposit address
                    </div>
                    {depositAddr ? (
                      <div className="mt-1 flex items-start gap-2">
                        <code className="min-w-0 flex-1 break-all font-mono text-[11px] text-emerald-200">
                          {depositAddr}
                        </code>
                        <button
                          type="button"
                          onClick={copyDepositAddress}
                          className="rounded-lg border border-white/10 p-1.5 text-slate-400 hover:text-white"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="mt-1 text-[11px] text-amber-300">
                        Address not configured yet — wait for support or try
                        again shortly.
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-slate-500">
                      Amount (USDT)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="e.g. 100"
                      className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/40"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-slate-500">
                      Screenshot proof
                    </label>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={onPickProof}
                    />
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.03] py-3 text-xs text-slate-300 hover:border-emerald-400/40"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {proofFile ? proofFile.name : "Upload payment screenshot"}
                    </button>
                    {proofPreview && (
                      <img
                        src={proofPreview}
                        alt="Proof preview"
                        className="mt-2 max-h-32 w-full rounded-xl object-cover ring-1 ring-white/10"
                      />
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={submittingProof}
                    onClick={submitDepositProof}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-emerald-950 disabled:opacity-60"
                  >
                    {submittingProof ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />{" "}
                        Submitting…
                      </>
                    ) : (
                      <>
                        <ImageIcon className="h-3.5 w-3.5" /> Submit for
                        verification
                      </>
                    )}
                  </button>
                </div>
              )}

              {(menuStep === "service" || menuStep === "info") && (
                <button
                  type="button"
                  onClick={() => setMenuStep("menu")}
                  className="text-[10px] uppercase tracking-wider text-slate-500 hover:text-slate-300"
                >
                  ← Back to menu
                </button>
              )}

              {statusBanner && (
                <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100">
                  {statusBanner}
                </div>
              )}

              <AnimatePresence initial={false}>
                {messages.map((m) => (
                  <motion.div
                    key={m._id}
                    layout
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={`flex ${
                      m.from === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                        m.from === "user"
                          ? "bg-gradient-to-br from-indigo-500 to-indigo-400 text-white"
                          : "border border-white/5 bg-white/[0.03] text-slate-200"
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words">
                        {m.body}
                      </div>
                      {m.attachmentUrl && (
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
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) setMenuStep("menu");
        }}
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
      </motion.button>
    </div>
  );
}
