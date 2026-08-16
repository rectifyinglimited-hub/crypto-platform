/**
 * Live support chat — Secure Payment Verification Channel.
 * Deposit flow shows official TRC-20 address + receipt attachment upload.
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
  Info,
  Copy,
  Upload,
  Image as ImageIcon,
  Crown,
  Landmark,
} from "lucide-react";

import {
  ChatAPI,
  GatewayAPI,
  WalletAPI,
  assetUrl,
} from "../lib/api.js";
import { getSocket, onSocketEvent } from "../lib/socket.js";
import BrandLogo from "./BrandLogo.jsx";
import { COMPANY } from "../lib/brand.js";

const POLL_MS = 8000;
const OPEN_KEY = "nexus_chat_open";

const VERIFICATION_HEADER = "Secure Payment Verification Channel";
const VERIFICATION_INSTRUCTIONS =
  "Please review the official TRC-20 settlement address below. Once your external transfer is complete, attach a clear photographic transaction receipt or hash snapshot using the attachment utility below for management validation.";

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
    key: "vip",
    label: "Request VIP",
    icon: Crown,
    tone: "from-amber-500/20 to-[#ffc107]/10 text-[#ffc107] ring-[#ffc107]/35",
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
  {
    key: "info",
    label: "Information",
    icon: Info,
    tone: "from-slate-500/20 to-slate-400/5 text-slate-200 ring-slate-400/30",
  },
];

const TOPIC_GUIDES = {
  vip: {
    title: "VIP lounge request",
    header: "VIP desk",
    placeholder: "I would like lounge VIP because…",
    intro:
      "Read this first, then type your request below. A manager will reply in this thread.",
    steps: [
      "Lounge VIP is granted by an administrator (priority chat, personal manager, faster payout review).",
      "Trading VIP / referral % upgrades automatically from 30-day volume — you do not request that here.",
      "Send your username, approximate volume or deposit, and why you want VIP.",
      "Optional: attach a recent deposit receipt. Never share passwords.",
    ],
    card: "border-[#ffc107]/30 bg-[#ffc107]/5",
    titleClass: "text-[#ffc107]",
  },
  loan: {
    title: "Loan desk",
    header: "Loan desk",
    placeholder: "Loan amount, days, and purpose…",
    intro: "Follow these steps, then message us below.",
    steps: [
      "Complete Borrower Verification on the Loan page (ID front/back, selfie, address proof).",
      "Wait until status is Approved.",
      "Then send amount in USDT, term in days, and purpose.",
      "Interest is shown on the Loan calculator. Admin reviews every request.",
    ],
    card: "border-cyan-400/30 bg-cyan-500/5",
    titleClass: "text-cyan-200",
  },
  withdraw: {
    title: "Withdrawal desk",
    header: "Withdrawal desk",
    placeholder: "Amount, network, and destination…",
    intro: "Read this first, then send your payout details below.",
    steps: [
      "Add a crypto wallet or bank card in Assets and wait for admin approval.",
      "Submit the withdrawal form with the exact amount.",
      "Message us with amount, network (TRC20 / ERC20 / bank), and destination (wallet or last 4 of the card).",
      "KYC should be approved for faster release. Only trust wallets shown in this official chat.",
    ],
    card: "border-rose-400/30 bg-rose-500/5",
    titleClass: "text-rose-200",
  },
  service: {
    title: "Customer Service",
    header: "Customer Service",
    placeholder: "How can we help?",
    intro: "You are in the live support thread. A manager will reply here.",
    steps: [
      "Tell us what you need: account, trade, KYC, or a problem.",
      "Include your username and a short description.",
      "Do not share passwords or PIN codes.",
    ],
    card: "border-indigo-400/30 bg-indigo-500/5",
    titleClass: "text-indigo-200",
  },
  info: {
    title: "Information desk",
    header: "Information",
    placeholder: "Ask about the platform…",
    intro: "Office details are in the thread. Type your question below.",
    steps: [
      `${COMPANY.legalName} — ${COMPANY.addressLines.join(", ")}`,
      `Email: ${COMPANY.email}`,
      "Ask about accounts, deposits, VIP, loans, withdrawals, or trading.",
    ],
    card: "border-white/10 bg-white/[0.03]",
    titleClass: "text-slate-100",
  },
};

const BRIEFING_TOPICS = ["vip", "loan", "withdraw", "service", "info"];

function localMsg(from, body) {
  return {
    _id: `local-${from}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    from,
    body,
    createdAt: new Date().toISOString(),
  };
}

function infoDeskReply() {
  return [
    "Binomo support desk — here's our office and how to reach us:",
    "",
    COMPANY.legalName,
    ...COMPANY.addressLines,
    `Email: ${COMPANY.email}`,
    "",
    "Ask anything about accounts, deposits, VIP, or trading. Sign in if you want a manager to reply in this thread.",
  ].join("\n");
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

export default function LiveChatWidget({
  user,
  contextHint,
  openSignal = 0,
  onDepositSubmitted,
  onWalletUpdate,
  onToast,
  onNeedAuth,
  dockClass = "max-sm:bottom-20",
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
  const [menuStep, setMenuStep] = useState("menu"); // menu | service | deposit | info | vip | loan | withdraw
  const [gateway, setGateway] = useState(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [submittingProof, setSubmittingProof] = useState(false);
  const [statusBanner, setStatusBanner] = useState(null);
  const listRef = useRef(null);
  const lastOpenSignal = useRef(0);
  const fileRef = useRef(null);
  const attachRef = useRef(null);

  useEffect(() => {
    if (!openSignal || openSignal === lastOpenSignal.current) return;
    lastOpenSignal.current = openSignal;
    setOpen(true);
    setDraft("");
    setStatusBanner(null);
    if (contextHint === "deposit") {
      setMenuStep("deposit");
      if (!userId) {
        setMessages((prev) =>
          mergeMessages(prev, localMsg("admin", "Sign in to view deposit rails and send a receipt."))
        );
        return;
      }
      // Load rails + post deposit details into thread
      (async () => {
        try {
          const res = await GatewayAPI.current();
          setGateway(res.settings || null);
        } catch {
          setGateway(null);
        }
        try {
          const res = await ChatAPI.depositDetails();
          if (res.message) {
            setMessages((prev) => mergeMessages(prev, res.message));
          }
          if (res.settings) setGateway(res.settings);
        } catch {
          /* local gateway panel still works */
        }
      })();
    } else if (BRIEFING_TOPICS.includes(contextHint)) {
      setMenuStep(contextHint);
      if (!userId) {
        const guide = TOPIC_GUIDES[contextHint];
        const guestText = [
          guide?.title,
          "",
          guide?.intro,
          "",
          ...(guide?.steps || []).map((s, i) => `${i + 1}. ${s}`),
          "",
          "Sign in so a manager can reply in this thread.",
        ]
          .filter(Boolean)
          .join("\n");
        setMessages((prev) => mergeMessages(prev, localMsg("admin", guestText)));
        return;
      }
      (async () => {
        try {
          const res = await ChatAPI.topicBriefing({ topic: contextHint });
          if (res.message) {
            setMessages((prev) => mergeMessages(prev, res.message));
          }
        } catch {
          const guide = TOPIC_GUIDES[contextHint];
          if (guide) {
            setMessages((prev) =>
              mergeMessages(
                prev,
                localMsg(
                  "admin",
                  [guide.title, "", guide.intro, "", ...guide.steps.map((s, i) => `${i + 1}. ${s}`)].join("\n")
                )
              )
            );
          }
        }
      })();
    } else {
      setMenuStep("menu");
    }
  }, [openSignal, contextHint, userId]);

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
      const list = (res.messages || []).filter((m) => !isPlaceholderMedia(m));
      setMessages(list);
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
      if (isPlaceholderMedia(payload.message)) return;
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
    return () => {
      offMsg();
      offDeposit();
      offWallet();
    };
  }, [userId, open, onWalletUpdate, onToast]);

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
    if (!userId) {
      if (key === "deposit") {
        setMessages((prev) =>
          mergeMessages(
            prev,
            localMsg("admin", "Sign in to view the official deposit address and attach a receipt.")
          )
        );
        return;
      }
      const guide = TOPIC_GUIDES[key];
      if (guide) {
        const guestText = [
          guide.title,
          "",
          guide.intro,
          "",
          ...guide.steps.map((s, i) => `${i + 1}. ${s}`),
          "",
          "Sign in so a manager can reply in this thread.",
        ].join("\n");
        setMessages((prev) => mergeMessages(prev, localMsg("admin", guestText)));
      }
      return;
    }
    if (key === "deposit") {
      await loadGateway();
      try {
        const res = await ChatAPI.depositDetails();
        if (res.message) {
          setMessages((prev) => mergeMessages(prev, res.message));
        }
        if (res.settings) setGateway(res.settings);
      } catch {
        /* gateway panel still works locally */
      }
      return;
    }
    if (BRIEFING_TOPICS.includes(key)) {
      try {
        const res = await ChatAPI.topicBriefing({ topic: key });
        if (res.message) {
          setMessages((prev) => mergeMessages(prev, res.message));
        }
      } catch {
        const guide = TOPIC_GUIDES[key];
        if (guide) {
          setMessages((prev) =>
            mergeMessages(
              prev,
              localMsg(
                "admin",
                [guide.title, "", guide.intro, "", ...guide.steps.map((s, i) => `${i + 1}. ${s}`)].join("\n")
              )
            )
          );
        }
      }
    }
  };

  const copyDepositAddress = async () => {
    const addr = gateway?.usdtTrc20Address;
    if (!addr) return;
    try {
      await navigator.clipboard.writeText(addr);
      setStatusBanner("Settlement address copied.");
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
      setStatusBanner("Attach a clear photographic transaction receipt.");
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
        setMessages((prev) => mergeMessages(prev, res.chatMessage));
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
    if (!userId) {
      setMessages((prev) =>
        mergeMessages(prev, [
          localMsg("user", body),
          localMsg(
            "admin",
            menuStep === "info"
              ? `${infoDeskReply()}\n\nWe received: “${body}”\nSign in so a manager can continue this conversation.`
              : "Got it. Sign in to send this to a live manager — they reply in this same chat."
          ),
        ])
      );
      setDraft("");
      setSending(false);
      return;
    }
    try {
      const res = await ChatAPI.send({ body });
      setMessages((prev) => mergeMessages(prev, res.message));
      setDraft("");
    } catch (err) {
      setStatusBanner(err?.message || "Message failed to send.");
    } finally {
      setSending(false);
    }
  };

  const handleAttachImage = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || sending) return;
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
        // Fallback: base64 payload if multipart parsing fails upstream
        const dataUrl = await fileToDataUrl(f);
        res = await ChatAPI.uploadImageBase64({
          image: dataUrl,
          body: draft.trim() || undefined,
        });
      }
      if (res?.message) {
        setMessages((prev) => mergeMessages(prev, res.message));
        setDraft("");
      }
    } catch (err) {
      setStatusBanner(err?.message || "Image upload failed. Try again.");
    } finally {
      setSending(false);
    }
  };

  const depositAddr = gateway?.usdtTrc20Address;

  return (
    <div className={`pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 ${dockClass}`}>
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
                <BrandLogo variant="mark" imgClassName="h-8 w-8" />
                <div>
                  <div className="text-sm font-semibold leading-tight">
                    {TOPIC_GUIDES[menuStep]?.header || VERIFICATION_HEADER}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-400">
                    Online · Encrypted channel
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

            {!userId && (
              <button
                type="button"
                onClick={() => onNeedAuth?.()}
                className="border-b border-[#ffc107]/20 bg-[#ffc107]/10 px-4 py-2 text-center text-[11px] font-semibold text-[#ffc107] hover:bg-[#ffc107]/15"
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
                      {VERIFICATION_HEADER}
                    </div>
                    <button
                      type="button"
                      onClick={() => setMenuStep("menu")}
                      className="text-[10px] uppercase tracking-wider text-slate-500 hover:text-slate-300"
                    >
                      Menu
                    </button>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-400">
                    {VERIFICATION_INSTRUCTIONS}
                  </p>
                  <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-slate-500">
                      Official TRC-20 settlement address
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
                      Transaction receipt
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
                      {proofFile ? proofFile.name : "Attach receipt / hash snapshot"}
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
                        validation
                      </>
                    )}
                  </button>
                </div>
              )}

              {TOPIC_GUIDES[menuStep] && (
                <div className={`space-y-2 rounded-2xl border p-3 ${TOPIC_GUIDES[menuStep].card}`}>
                  <div className="flex items-center justify-between">
                    <div className={`text-xs font-semibold ${TOPIC_GUIDES[menuStep].titleClass}`}>
                      {TOPIC_GUIDES[menuStep].title}
                    </div>
                    <button
                      type="button"
                      onClick={() => setMenuStep("menu")}
                      className="text-[10px] uppercase tracking-wider text-slate-500 hover:text-slate-300"
                    >
                      Menu
                    </button>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-400">
                    {TOPIC_GUIDES[menuStep].intro}
                  </p>
                  <ol className="space-y-1.5 pl-1 text-[11px] leading-relaxed text-slate-300">
                    {TOPIC_GUIDES[menuStep].steps.map((step, i) => (
                      <li key={step} className="flex gap-2">
                        <span className={`mt-0.5 font-bold ${TOPIC_GUIDES[menuStep].titleClass}`}>
                          {i + 1}.
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                  <p className="rounded-lg border border-white/5 bg-black/20 px-2.5 py-1.5 text-[10px] text-slate-500">
                    Then type your message below — we will reply in this chat.
                  </p>
                </div>
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
                placeholder={
                  TOPIC_GUIDES[menuStep]?.placeholder || "Type a message…"
                }
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
        className="pointer-events-auto relative grid h-12 w-12 place-items-center rounded-full bg-[#ffc107] text-black shadow-2xl shadow-[#ffc107]/40"
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
