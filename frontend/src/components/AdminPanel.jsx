/**
 * =============================================================================
 *  NEXUS FRONTEND — src/components/AdminPanel.jsx
 * =============================================================================
 *  Admin console — sidebar nav + 5 sections:
 *    1. Overview     — Total users, active codes, mock volume.
 *    2. Invite Codes — Create / list / delete.
 *    3. Users        — Directory, balance modal, ban toggle.
 *    4. Transactions — Approve / reject pending deposits & withdrawals.
 *    5. Support Chat — Full AdminChatManager panel.
 * =============================================================================
 */

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  LayoutDashboard,
  Ticket,
  Users,
  ArrowLeft,
  RefreshCw,
  Plus,
  Trash2,
  X,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  Search,
  Ban,
  ShieldCheck,
  Loader2,
  Copy,
  UserCog,
  TrendingUp,
  Receipt,
  MessageSquare,
  ArrowDownToLine,
  ArrowUpFromLine,
  BadgeCheck,
  FileText,
  Clock,
  Building2,
  Save,
  Landmark,
  Hash,
  Phone,
  KeyRound,
} from "lucide-react";
import { AdminAPI, assetUrl } from "../lib/api.js";
import AdminChatManager from "./AdminChatManager.jsx";
import UserControlRoom, {
  ActiveTradesAlertBar,
} from "./UserControlRoom.jsx";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const fmtUSD = (n) =>
  Number(n).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
const fmtNum = (n) => Number(n).toLocaleString();
const fmt = (n, d = 6) =>
  Number(n).toLocaleString(undefined, { maximumFractionDigits: d });

// ---------------------------------------------------------------------------
// Framer variants
// ---------------------------------------------------------------------------
const listContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const listItem = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 240, damping: 22 },
  },
  exit: { opacity: 0, x: -20, transition: { duration: 0.18 } },
};
const viewVariants = {
  hidden: { opacity: 0, x: 24 },
  show: { opacity: 1, x: 0, transition: { duration: 0.28 } },
  exit: { opacity: 0, x: -24, transition: { duration: 0.22 } },
};

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------
const Toast = ({ kind, message, onClose }) => (
  <AnimatePresence>
    {message && (
      <motion.div
        initial={{ opacity: 0, y: -18, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -14, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 320, damping: 24 }}
        className={`fixed left-1/2 top-6 z-50 -translate-x-1/2 rounded-xl border px-4 py-2.5 shadow-2xl backdrop-blur-xl ${
          kind === "success"
            ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
            : "border-rose-400/25 bg-rose-500/10 text-rose-200"
        }`}
      >
        <div className="flex items-center gap-2.5">
          {kind === "success" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <span className="text-sm font-medium">{message}</span>
          <button
            onClick={onClose}
            className="ml-2 rounded p-0.5 text-xs opacity-70 hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

const StatusBadge = ({ status }) => {
  const map = {
    active: {
      cls: "bg-emerald-500/15 text-emerald-300 border-emerald-400/25",
      label: "Active",
    },
    disabled: {
      cls: "bg-slate-500/15 text-slate-300 border-slate-400/25",
      label: "Disabled",
    },
    expired: {
      cls: "bg-amber-500/15 text-amber-300 border-amber-400/25",
      label: "Expired",
    },
    exhausted: {
      cls: "bg-rose-500/15 text-rose-300 border-rose-400/25",
      label: "Used",
    },
    pending: {
      cls: "bg-amber-500/15 text-amber-300 border-amber-400/25",
      label: "Pending",
    },
    approved: {
      cls: "bg-emerald-500/15 text-emerald-300 border-emerald-400/25",
      label: "Approved",
    },
    rejected: {
      cls: "bg-rose-500/15 text-rose-300 border-rose-400/25",
      label: "Rejected",
    },
    completed: {
      cls: "bg-emerald-500/15 text-emerald-300 border-emerald-400/25",
      label: "Completed",
    },
  };
  const meta = map[status] || map.disabled;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${meta.cls}`}
    >
      {meta.label}
    </span>
  );
};

// ---------------------------------------------------------------------------
// OverviewView
// ---------------------------------------------------------------------------
const OverviewView = ({ stats, loading, onRefresh }) => {
  const cards = [
    {
      label: "Total Users",
      value: fmtNum(stats?.totalUsers || 0),
      icon: Users,
      accent: "from-indigo-500/20 to-indigo-400/5",
    },
    {
      label: "Active Invite Codes",
      value: fmtNum(stats?.activeInviteCodes || 0),
      icon: Ticket,
      accent: "from-emerald-500/20 to-emerald-400/5",
    },
    {
      label: "Pending Transactions",
      value: fmtNum(stats?.pendingTransactions || 0),
      icon: Receipt,
      accent: "from-amber-500/20 to-amber-400/5",
    },
    {
      label: "Mock Volume (24h)",
      value: fmtUSD(stats?.mockVolume24h || 0),
      icon: TrendingUp,
      accent: "from-cyan-500/20 to-cyan-400/5",
    },
  ];

  return (
    <motion.div
      variants={viewVariants}
      initial="hidden"
      animate="show"
      exit="exit"
    >
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Platform Overview
          </h2>
          <p className="text-xs text-slate-500">
            Real-time snapshot of the Nexus network.
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-1.5 text-[11px] font-medium text-slate-300 hover:bg-white/[0.05] disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          Refresh
        </button>
      </div>

      <motion.div
        variants={listContainer}
        initial="hidden"
        animate="show"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {cards.map((c) => (
          <motion.div
            key={c.label}
            variants={listItem}
            className={`relative overflow-hidden rounded-2xl border border-white/5 bg-slate-900/60 p-5 backdrop-blur-sm`}
          >
            <div
              className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br ${c.accent} blur-2xl`}
            />
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              <c.icon className="h-3 w-3" /> {c.label}
            </div>
            <div className="mt-2 text-2xl font-bold tracking-tight">
              {c.value}
            </div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        variants={viewVariants}
        className="mt-6 grid gap-4 lg:grid-cols-2"
      >
        <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-5 backdrop-blur-sm">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            Network Composition
          </div>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center justify-between">
              <span className="text-slate-300">Admins</span>
              <span className="font-semibold">{fmtNum(stats?.admins || 0)}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-slate-300">Banned accounts</span>
              <span className="font-semibold text-rose-300">
                {fmtNum(stats?.bannedUsers || 0)}
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-slate-300">Total invite codes</span>
              <span className="font-semibold">
                {fmtNum(stats?.totalInviteCodes || 0)}
              </span>
            </li>
          </ul>
        </div>
        <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-5 backdrop-blur-sm">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            System Notes
          </div>
          <p className="text-sm text-slate-400">
            Volume and trade counts are simulated for demonstration. Wire them
            to your analytics pipeline in production.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ---------------------------------------------------------------------------
// InviteCodesView
// ---------------------------------------------------------------------------
const InviteCodesView = ({ codes, loading, onRefresh, onCreate, onDelete }) => {
  const [form, setForm] = useState({
    code: "",
    role: "user",
    maxUses: 1,
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await onCreate({
        code: form.code || null,
        role: form.role,
        maxUses: Number(form.maxUses) || 1,
        notes: form.notes || null,
      });
      setForm({ code: "", role: "user", maxUses: 1, notes: "" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = (code) => {
    try {
      navigator.clipboard?.writeText(code);
    } catch {
      /* ignore */
    }
  };

  return (
    <motion.div
      variants={viewVariants}
      initial="hidden"
      animate="show"
      exit="exit"
    >
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Invitation Code Manager
          </h2>
          <p className="text-xs text-slate-500">
            Generate custom codes, control roles, and audit redemptions.
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-1.5 text-[11px] font-medium text-slate-300 hover:bg-white/[0.05] disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          Refresh
        </button>
      </div>

      <form
        onSubmit={handleCreate}
        className="mb-6 rounded-2xl border border-white/5 bg-slate-900/60 p-5 backdrop-blur-sm"
      >
        <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
          <Plus className="h-3 w-3" /> Generate New Code
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Code (optional)
            </label>
            <input
              value={form.code}
              onChange={(e) =>
                setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
              }
              placeholder="AUTO-GENERATE"
              className="w-full rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Grants Role
            </label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              className="w-full appearance-none rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-sm text-slate-100 outline-none"
            >
              <option value="user" className="bg-slate-900">
                Standard User
              </option>
              <option value="admin" className="bg-slate-900">
                Admin
              </option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Max Uses
            </label>
            <input
              type="number"
              min="1"
              value={form.maxUses}
              onChange={(e) =>
                setForm((f) => ({ ...f, maxUses: e.target.value }))
              }
              className="w-full rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-sm text-slate-100 outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Notes
            </label>
            <input
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="e.g. Q3 partner batch"
              className="w-full rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600"
            />
          </div>
        </div>
        <motion.button
          type="submit"
          disabled={submitting}
          whileHover={!submitting ? { scale: 1.01 } : undefined}
          whileTap={!submitting ? { scale: 0.99 } : undefined}
          className="mt-4 flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-400 to-emerald-400 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 disabled:opacity-70"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Generating…
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" /> Create Code
            </>
          )}
        </motion.button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-white/5 bg-slate-900/60 backdrop-blur-sm">
        <div className="grid grid-cols-12 gap-3 border-b border-white/5 px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          <div className="col-span-3">Code</div>
          <div className="col-span-2">Role</div>
          <div className="col-span-2">Usage</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Created</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        <motion.ul
          variants={listContainer}
          initial="hidden"
          animate="show"
          className="divide-y divide-white/5"
        >
          <AnimatePresence initial={false}>
            {codes.map((c) => (
              <motion.li
                key={c._id || c.code}
                variants={listItem}
                exit="exit"
                layout
                className="grid grid-cols-12 items-center gap-3 px-5 py-3 text-sm"
              >
                <div className="col-span-3 flex items-center gap-2">
                  <code className="rounded-md bg-white/[0.03] px-2 py-1 font-mono text-[12px] tracking-wider text-indigo-200">
                    {c.code}
                  </code>
                  <button
                    onClick={() => handleCopy(c.code)}
                    className="rounded p-1 text-slate-500 hover:bg-white/[0.05] hover:text-slate-200"
                    title="Copy"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
                <div className="col-span-2 capitalize text-slate-300">
                  {c.role}
                </div>
                <div className="col-span-2 text-slate-300">
                  {(c.usedBy?.length || 0)}/{c.maxUses}
                </div>
                <div className="col-span-2">
                  <StatusBadge status={c.status} />
                </div>
                <div className="col-span-2 text-xs text-slate-500">
                  {c.createdAt
                    ? new Date(c.createdAt).toLocaleDateString()
                    : "—"}
                </div>
                <div className="col-span-1 flex justify-end">
                  <motion.button
                    onClick={() => onDelete(c)}
                    whileTap={{ scale: 0.9 }}
                    className="rounded-lg border border-white/5 bg-white/[0.02] p-1.5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-300"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </motion.button>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
          {!loading && codes.length === 0 && (
            <li className="px-5 py-10 text-center text-xs text-slate-500">
              No invite codes yet. Generate your first one above.
            </li>
          )}
        </motion.ul>
      </div>
    </motion.div>
  );
};

// ---------------------------------------------------------------------------
// BalanceModal
// ---------------------------------------------------------------------------
const BalanceModal = ({ user, onClose, onSubmit }) => {
  const [symbol, setSymbol] = useState("USDT");
  const [mode, setMode] = useState("set");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const currentBalance = useMemo(() => {
    if (!user) return 0;
    const w = user.wallet || {};
    return Number(w[symbol] || 0);
  }, [user, symbol]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({ symbol, mode, amount: Number(amount) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {user && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-2xl border border-white/5 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-2xl"
          >
            <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-transparent to-emerald-400/10 opacity-60 blur-xl" />
            <div className="relative">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Wallet className="h-4 w-4 text-emerald-300" /> Adjust Balance
                </div>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mb-4 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-xs text-slate-400">
                <div className="font-semibold text-slate-200">
                  {user.fullName}{" "}
                  <span className="ml-1 text-slate-500">@{user.username}</span>
                </div>
                <div className="mt-0.5">{user.email}</div>
              </div>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                      Symbol
                    </label>
                    <input
                      value={symbol}
                      onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                      className="w-full rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-sm font-mono text-slate-100 outline-none"
                    />
                    <div className="mt-1 text-[10px] text-slate-500">
                      Current: {currentBalance}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                      Mode
                    </label>
                    <select
                      value={mode}
                      onChange={(e) => setMode(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-sm text-slate-100 outline-none"
                    >
                      <option value="set" className="bg-slate-900">
                        Set to
                      </option>
                      <option value="add" className="bg-slate-900">
                        Add (± delta)
                      </option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                    Amount
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600"
                  />
                </div>
                <motion.button
                  type="submit"
                  disabled={submitting}
                  whileHover={!submitting ? { scale: 1.01 } : undefined}
                  whileTap={!submitting ? { scale: 0.99 } : undefined}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 disabled:opacity-70"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                    </>
                  ) : (
                    <>
                      <Wallet className="h-4 w-4" /> Apply Change
                    </>
                  )}
                </motion.button>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ---------------------------------------------------------------------------
// UserRow — single row with details + inline "Update Wallet"
// ---------------------------------------------------------------------------
const walletValue = (u, symbol) => {
  const w = u?.wallet || {};
  const raw = w instanceof Map ? w.get(symbol) : w[symbol];
  return Number(raw || 0);
};

const TRADE_CONTROL_OPTIONS = [
  { value: "normal", label: "Normal", color: "slate" },
  { value: "force_win", label: "Force Win", color: "emerald" },
  { value: "force_loss", label: "Force Loss", color: "rose" },
];

const TradeControlCell = ({ user, onSaveTradeControl }) => {
  const [state, setState] = useState(user.tradeControlState || "normal");
  const [pct, setPct] = useState(
    Number.isFinite(user.tradeControlPercentage)
      ? String(user.tradeControlPercentage)
      : "5"
  );
  const [saving, setSaving] = useState(false);

  // Sync when parent user prop updates from server
  useEffect(() => {
    setState(user.tradeControlState || "normal");
    setPct(
      Number.isFinite(user.tradeControlPercentage)
        ? String(user.tradeControlPercentage)
        : "5"
    );
  }, [user.tradeControlState, user.tradeControlPercentage]);

  const dirty =
    state !== (user.tradeControlState || "normal") ||
    Number(pct) !== Number(user.tradeControlPercentage);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onSaveTradeControl(user, state, Number(pct));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-widest text-slate-500">
        <span>Trade Control</span>
        {state !== "normal" && (
          <span
            className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
              state === "force_win"
                ? "bg-emerald-500/20 text-emerald-200"
                : "bg-rose-500/20 text-rose-200"
            }`}
          >
            ACTIVE
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex gap-1 rounded-lg border border-white/5 bg-white/[0.02] p-0.5">
          {TRADE_CONTROL_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setState(o.value)}
              className={`relative flex-1 rounded px-1.5 py-1 text-[9px] font-semibold uppercase tracking-wider transition ${
                state === o.value
                  ? o.color === "emerald"
                    ? "text-emerald-200"
                    : o.color === "rose"
                    ? "text-rose-200"
                    : "text-slate-200"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {state === o.value && (
                <motion.span
                  layoutId={`tc-pill-${user._id}`}
                  className={`absolute inset-0 rounded ${
                    o.color === "emerald"
                      ? "bg-emerald-500/20"
                      : o.color === "rose"
                      ? "bg-rose-500/20"
                      : "bg-slate-500/25"
                  }`}
                />
              )}
              <span className="relative">
                {o.value === "normal"
                  ? "Norm"
                  : o.value === "force_win"
                  ? "Win"
                  : "Loss"}
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <div className="relative flex-1">
            <input
              type="number"
              step="any"
              value={pct}
              onChange={(e) => setPct(e.target.value)}
              placeholder="5"
              disabled={state === "normal"}
              className="w-full rounded-lg border border-white/5 bg-white/[0.03] px-2 py-1 pr-5 text-[10px] text-slate-100 outline-none placeholder:text-slate-600 disabled:opacity-40"
            />
            <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-500">
              %
            </span>
          </div>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={save}
            disabled={saving || (!dirty && state !== "normal")}
            className="flex shrink-0 items-center gap-0.5 rounded-lg bg-gradient-to-r from-indigo-500 to-indigo-400 px-2 py-1 text-[10px] font-semibold text-white shadow-sm shadow-indigo-500/25 disabled:opacity-40"
            title="Save trade control"
          >
            {saving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Save className="h-3 w-3" />
            )}
            Save
          </motion.button>
        </div>
      </div>
    </div>
  );
};

const UserRow = ({
  user,
  currentUserId,
  onEditBalance,
  onInlineAdjust,
  onToggleBan,
  onSaveTradeControl,
  onOpenControlRoom,
  onDeleteUser,
  onResetPassword,
}) => {
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [newPwd, setNewPwd] = useState("");
  const [pwdBusy, setPwdBusy] = useState(false);

  const usdt = walletValue(user, "USDT");
  const btc = walletValue(user, "BTC");
  const eth = walletValue(user, "ETH");

  const doUpdate = async () => {
    const n = Number(amount);
    if (!Number.isFinite(n) || n < 0 || saving) return;
    setSaving(true);
    try {
      await onInlineAdjust(user, "USDT", n, "set");
      setAmount("");
    } finally {
      setSaving(false);
    }
  };

  const doResetPwd = async () => {
    if (!newPwd || newPwd.length < 8 || pwdBusy) return;
    setPwdBusy(true);
    try {
      await onResetPassword?.(user, newPwd);
      setNewPwd("");
      setPwdOpen(false);
    } finally {
      setPwdBusy(false);
    }
  };

  return (
    <motion.li
      variants={listItem}
      exit="exit"
      layout
      className="grid grid-cols-12 items-center gap-3 px-5 py-3.5 text-sm"
    >
      {/* Identity */}
      <div className="col-span-3 flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-emerald-400 text-[11px] font-bold text-white">
          {user.initials ||
            (user.fullName || "?")
              .split(/\s+/)
              .slice(0, 2)
              .map((s) => s[0])
              .join("")
              .toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="truncate font-semibold">
            {user.fullName}
            <span className="ml-1 text-[10px] font-normal text-slate-500">
              @{user.username}
            </span>
          </div>
          <div className="truncate text-[11px] text-slate-500">
            {user.email}
          </div>
          {user.trc20Address ? (
            <div className="mt-1 rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-2 py-1">
              <div className="text-[9px] font-semibold uppercase tracking-wider text-cyan-400/80">
                User TRC-20 wallet
              </div>
              <div className="mt-0.5 break-all font-mono text-[10px] text-cyan-100">
                {user.trc20Address}
              </div>
            </div>
          ) : (
            <div className="mt-1 text-[10px] text-slate-600">
              TRC-20 not set
            </div>
          )}
          <div className="mt-1 flex gap-1">
            <span
              className={`inline-flex items-center rounded-full border px-1.5 py-0 text-[9px] font-semibold uppercase tracking-wider ${
                user.role === "admin"
                  ? "border-indigo-400/25 bg-indigo-500/15 text-indigo-300"
                  : "border-slate-400/20 bg-slate-500/10 text-slate-300"
              }`}
            >
              {user.role}
            </span>
            <span
              className={`inline-flex items-center rounded-full border px-1.5 py-0 text-[9px] font-semibold uppercase tracking-wider ${
                user.banned
                  ? "border-rose-400/25 bg-rose-500/15 text-rose-300"
                  : "border-emerald-400/25 bg-emerald-500/15 text-emerald-300"
              }`}
            >
              {user.banned ? "Banned" : "Active"}
            </span>
          </div>
        </div>
      </div>

      {/* Phone */}
      <div className="col-span-2">
        <div className="text-[10px] uppercase tracking-widest text-slate-500">
          Phone
        </div>
        <div className="truncate text-xs text-slate-300">
          {user.phone || "—"}
        </div>
        <div className="mt-0.5 truncate text-[10px] text-slate-500">
          {user.country || "—"}
        </div>
      </div>

      {/* Current balance */}
      <div className="col-span-2">
        <div className="text-[10px] uppercase tracking-widest text-slate-500">
          Wallet
        </div>
        <div
          className={`text-sm font-semibold tabular-nums ${
            usdt < 0 ? "text-rose-400" : "text-emerald-300"
          }`}
        >
          {usdt < 0 ? "-" : ""}
          {Math.abs(usdt).toLocaleString(undefined, {
            maximumFractionDigits: 2,
          })}{" "}
          <span className="text-[9px] text-slate-500">USDT</span>
        </div>
        <div className="text-[10px] text-slate-500">
          BTC {btc.toLocaleString(undefined, { maximumFractionDigits: 4 })} ·
          ETH {eth.toLocaleString(undefined, { maximumFractionDigits: 3 })}
        </div>
      </div>

      {/* Inline adjust */}
      <div className="col-span-2">
        <div className="text-[10px] uppercase tracking-widest text-slate-500">
          Set USDT
        </div>
        <div className="mt-1 flex items-center gap-1.5">
          <input
            type="number"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={String(usdt)}
            className="w-full rounded-lg border border-white/5 bg-white/[0.03] px-2 py-1.5 text-xs text-slate-100 outline-none placeholder:text-slate-600"
          />
          <motion.button
            whileTap={{ scale: 0.92 }}
            disabled={saving || amount === ""}
            onClick={doUpdate}
            className="flex shrink-0 items-center gap-1 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-400 px-2 py-1.5 text-[10px] font-semibold text-white shadow-sm shadow-emerald-500/25 disabled:opacity-50"
            title="Update wallet"
          >
            {saving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Wallet className="h-3 w-3" />
            )}
            Update
          </motion.button>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={async () => {
            const ok = window.confirm(
              "Clear this user's Trading Wallet to exactly $0.00 USDT?"
            );
            if (!ok) return;
            setSaving(true);
            try {
              await onInlineAdjust(user, "USDT", 0, "set");
            } finally {
              setSaving(false);
            }
          }}
          className="mt-1 w-full rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[10px] font-semibold text-rose-300 disabled:opacity-50"
        >
          Clear Balance
        </button>
      </div>

      {/* Trade Control */}
      <div className="col-span-2">
        <TradeControlCell
          user={user}
          onSaveTradeControl={onSaveTradeControl}
        />
      </div>

      {/* Actions */}
      <div className="col-span-1 flex flex-col items-end gap-1">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => onOpenControlRoom?.(user)}
          className="flex items-center gap-1 rounded-lg border border-cyan-400/25 bg-cyan-500/10 px-2 py-1 text-[10px] font-medium text-cyan-200 hover:bg-cyan-500/15"
          title="Open control room"
        >
          <UserCog className="h-3 w-3" /> Room
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => onEditBalance(user)}
          className="flex items-center gap-1 rounded-lg border border-white/5 bg-white/[0.02] px-2 py-1 text-[10px] font-medium text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-200"
          title="Full adjust modal"
        >
          <Wallet className="h-3 w-3" /> More
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setPwdOpen((v) => !v)}
          disabled={user._id === currentUserId}
          className="flex items-center gap-1 rounded-lg border border-amber-400/25 bg-amber-500/10 px-2 py-1 text-[10px] font-medium text-amber-200 disabled:opacity-40"
        >
          <KeyRound className="h-3 w-3" /> Reset PW
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => onToggleBan(user, !user.banned)}
          disabled={user._id === currentUserId}
          className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-medium disabled:cursor-not-allowed disabled:opacity-40 ${
            user.banned
              ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15"
              : "border-rose-400/25 bg-rose-500/10 text-rose-200 hover:bg-rose-500/15"
          }`}
          title={user.banned ? "Set Active" : "Ban user"}
        >
          {user.banned ? (
            <>
              <ShieldCheck className="h-3 w-3" /> Active
            </>
          ) : (
            <>
              <Ban className="h-3 w-3" /> Ban
            </>
          )}
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => onDeleteUser?.(user)}
          disabled={user._id === currentUserId || user.role === "admin"}
          className="flex items-center gap-1 rounded-lg border border-rose-500/40 bg-rose-600/20 px-2 py-1 text-[10px] font-medium text-rose-200 disabled:opacity-40"
        >
          <Trash2 className="h-3 w-3" /> Delete
        </motion.button>
        {pwdOpen && (
          <div className="mt-1 w-full min-w-[140px] space-y-1 rounded-lg border border-white/10 bg-black/40 p-2">
            <input
              type="text"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              placeholder="New password (8+)"
              className="w-full rounded border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white outline-none"
            />
            <button
              type="button"
              onClick={doResetPwd}
              disabled={pwdBusy || newPwd.length < 8}
              className="w-full rounded bg-amber-500 py-1 text-[10px] font-bold text-amber-950 disabled:opacity-50"
            >
              {pwdBusy ? "Saving…" : "Save password"}
            </button>
          </div>
        )}
      </div>
    </motion.li>
  );
};

// ---------------------------------------------------------------------------
// UsersView
// ---------------------------------------------------------------------------
const UsersView = ({
  users,
  loading,
  onRefresh,
  onEditBalance,
  onInlineAdjust,
  onToggleBan,
  onSaveTradeControl,
  onOpenControlRoom,
  onDeleteUser,
  onResetPassword,
  query,
  onQueryChange,
  currentUserId,
}) => (
  <motion.div
    variants={viewVariants}
    initial="hidden"
    animate="show"
    exit="exit"
  >
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          User Management
        </h2>
        <p className="text-xs text-slate-500">
          Full registered directory · phone, wallet balance and instant
          "Update Wallet" per user.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-1.5">
          <Search className="h-3.5 w-3.5 text-slate-500" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search name / email / username"
            className="w-56 bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-600"
          />
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-1.5 text-[11px] font-medium text-slate-300 hover:bg-white/[0.05] disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          Refresh
        </button>
      </div>
    </div>

    <div className="overflow-hidden rounded-2xl border border-white/5 bg-slate-900/60 backdrop-blur-sm">
      <div className="grid grid-cols-12 gap-3 border-b border-white/5 px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
        <div className="col-span-3">User</div>
        <div className="col-span-2">Phone · Country</div>
        <div className="col-span-2">Current Balance</div>
        <div className="col-span-2">Adjust Balance</div>
        <div className="col-span-2">Trade Control</div>
        <div className="col-span-1 text-right">Actions</div>
      </div>

      <motion.ul
        variants={listContainer}
        initial="hidden"
        animate="show"
        className="divide-y divide-white/5"
      >
        <AnimatePresence initial={false}>
          {users.map((u) => (
            <UserRow
              key={u._id}
              user={u}
              currentUserId={currentUserId}
              onEditBalance={onEditBalance}
              onInlineAdjust={onInlineAdjust}
              onToggleBan={onToggleBan}
              onSaveTradeControl={onSaveTradeControl}
              onOpenControlRoom={onOpenControlRoom}
              onDeleteUser={onDeleteUser}
              onResetPassword={onResetPassword}
            />
          ))}
        </AnimatePresence>
        {!loading && users.length === 0 && (
          <li className="px-5 py-10 text-center text-xs text-slate-500">
            No users match your search.
          </li>
        )}
      </motion.ul>
    </div>
  </motion.div>
);

// ---------------------------------------------------------------------------
// TransactionsView — approve / reject queue
// ---------------------------------------------------------------------------
const TransactionsView = ({
  transactions,
  loading,
  onRefresh,
  onVerify,
  filter,
  onFilterChange,
}) => (
  <motion.div
    variants={viewVariants}
    initial="hidden"
    animate="show"
    exit="exit"
  >
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          Transaction Queue
        </h2>
        <p className="text-xs text-slate-500">
          Review deposit and withdrawal requests. Approving adjusts wallet
          balances automatically.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex gap-1 rounded-xl border border-white/5 bg-white/[0.02] p-1">
          {["pending", "approved", "rejected", "all"].map((f) => (
            <button
              key={f}
              onClick={() => onFilterChange(f)}
              className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                filter === f
                  ? "bg-white/[0.06] text-slate-100"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-1.5 text-[11px] font-medium text-slate-300 hover:bg-white/[0.05] disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          Refresh
        </button>
      </div>
    </div>

    <div className="overflow-hidden rounded-2xl border border-white/5 bg-slate-900/60 backdrop-blur-sm">
      <div className="grid grid-cols-12 gap-3 border-b border-white/5 px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
        <div className="col-span-3">User</div>
        <div className="col-span-2">Type</div>
        <div className="col-span-2">Amount</div>
        <div className="col-span-2">Network</div>
        <div className="col-span-1">Status</div>
        <div className="col-span-2 text-right">Actions</div>
      </div>

      <motion.ul
        variants={listContainer}
        initial="hidden"
        animate="show"
        className="divide-y divide-white/5"
      >
        <AnimatePresence initial={false}>
          {transactions.map((t) => (
            <motion.li
              key={t._id}
              variants={listItem}
              exit="exit"
              layout
              className="grid grid-cols-12 items-center gap-3 px-5 py-3 text-sm"
            >
              <div className="col-span-3 min-w-0">
                <div className="truncate text-xs font-semibold">
                  {t.user?.fullName || "Unknown"}
                </div>
                <div className="truncate text-[10px] text-slate-500">
                  @{t.user?.username}
                </div>
              </div>
              <div className="col-span-2 flex items-center gap-2 text-xs capitalize text-slate-300">
                {t.kind === "deposit" ? (
                  <ArrowDownToLine className="h-3.5 w-3.5 text-emerald-300" />
                ) : t.kind === "withdrawal" ? (
                  <ArrowUpFromLine className="h-3.5 w-3.5 text-rose-300" />
                ) : (
                  <Receipt className="h-3.5 w-3.5 text-indigo-300" />
                )}
                {t.kind}
              </div>
              <div className="col-span-2 tabular-nums text-slate-200">
                {fmt(t.amount, 6)} {t.symbol}
              </div>
              <div className="col-span-2 text-xs text-slate-500">
                {t.network || "—"}
                {t.proofUrl && (
                  <a
                    href={assetUrl(t.proofUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block text-[10px] font-semibold text-cyan-300 hover:underline"
                  >
                    View screenshot
                  </a>
                )}
              </div>
              <div className="col-span-1">
                <StatusBadge status={t.status} />
              </div>
              <div className="col-span-2 flex justify-end gap-1.5">
                {t.status === "pending" ? (
                  <>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => onVerify(t, "approve")}
                      className="flex items-center gap-1 rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-500/15"
                    >
                      <CheckCircle2 className="h-3 w-3" /> Approve
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => onVerify(t, "reject")}
                      className="flex items-center gap-1 rounded-lg border border-rose-400/25 bg-rose-500/10 px-2 py-1 text-[11px] font-semibold text-rose-200 hover:bg-rose-500/15"
                    >
                      <X className="h-3 w-3" /> Decline
                    </motion.button>
                  </>
                ) : (
                  <span className="text-[10px] text-slate-500">
                    {t.reviewedAt
                      ? new Date(t.reviewedAt).toLocaleDateString()
                      : ""}
                  </span>
                )}
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
        {!loading && transactions.length === 0 && (
          <li className="px-5 py-10 text-center text-xs text-slate-500">
            No transactions match this filter.
          </li>
        )}
      </motion.ul>
    </div>
  </motion.div>
);

// ---------------------------------------------------------------------------
// GatewayView — configure the platform-wide deposit credentials
// ---------------------------------------------------------------------------
const GATEWAY_FIELDS = [
  {
    key: "bankName",
    label: "Bank Name",
    icon: Building2,
    placeholder: "e.g. Meezan Bank",
  },
  {
    key: "accountTitle",
    label: "Account Title",
    icon: Users,
    placeholder: "Legal account holder name",
  },
  {
    key: "accountNumber",
    label: "Account Number",
    icon: Hash,
    placeholder: "1234567890",
  },
  {
    key: "iban",
    label: "IBAN (optional)",
    icon: Hash,
    placeholder: "PK00 XXXX XXXX XXXX XXXX",
  },
  {
    key: "easyPaisaNumber",
    label: "EasyPaisa Number",
    icon: Phone,
    placeholder: "03XX XXXXXXX",
  },
  {
    key: "jazzCashNumber",
    label: "JazzCash Number",
    icon: Phone,
    placeholder: "03XX XXXXXXX",
  },
  {
    key: "usdtTrc20Address",
    label: "USDT TRC20 Address",
    icon: Wallet,
    placeholder: "T...",
    mono: true,
  },
  {
    key: "usdtErc20Address",
    label: "USDT ERC20 Address",
    icon: Wallet,
    placeholder: "0x...",
    mono: true,
  },
];

const GatewayView = ({ settings, loading, onRefresh, onSave, updatedAt }) => {
  const [draft, setDraft] = useState(settings || {});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(settings || {});
  }, [settings]);

  const handleChange = (key) => (e) =>
    setDraft((d) => ({ ...d, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await onSave(draft);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      variants={viewVariants}
      initial="hidden"
      animate="show"
      exit="exit"
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Deposit Gateway Settings
          </h2>
          <p className="text-xs text-slate-500">
            Save your USDT TRC-20 (and other rails) here. Live Chat → Deposit
            automatically sends these details to the user.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {updatedAt && (
            <span className="text-[10px] text-slate-500">
              Saved {new Date(updatedAt).toLocaleString()}
            </span>
          )}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-1.5 text-[11px] font-medium text-slate-300 hover:bg-white/[0.05] disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            Refresh
          </button>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-white/5 bg-slate-900/60 p-6 backdrop-blur-sm"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {GATEWAY_FIELDS.map((f) => (
            <div key={f.key}>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                {f.label}
              </label>
              <div className="flex items-center rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5">
                <f.icon className="mr-2 h-4 w-4 shrink-0 text-slate-500" />
                <input
                  value={draft[f.key] || ""}
                  onChange={handleChange(f.key)}
                  placeholder={f.placeholder}
                  className={`w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-600 ${
                    f.mono ? "font-mono" : ""
                  }`}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Instructions to display (optional)
          </label>
          <textarea
            value={draft.instructions || ""}
            onChange={handleChange("instructions")}
            rows={3}
            placeholder="e.g. After transferring, please include your username in the payment reference."
            className="w-full rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600"
          />
        </div>

        <motion.button
          type="submit"
          disabled={saving}
          whileHover={!saving ? { scale: 1.01 } : undefined}
          whileTap={!saving ? { scale: 0.99 } : undefined}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-400 to-emerald-400 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 disabled:opacity-70 sm:w-auto sm:px-6"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving…
            </>
          ) : (
            <>
              <Save className="h-4 w-4" /> Save Gateway Settings
            </>
          )}
        </motion.button>
      </form>
    </motion.div>
  );
};

// ---------------------------------------------------------------------------
// KycView — approve / reject pending KYC submissions
// ---------------------------------------------------------------------------
const KycView = ({
  requests,
  loading,
  onRefresh,
  onReview,
  filter,
  onFilterChange,
}) => (
  <motion.div
    variants={viewVariants}
    initial="hidden"
    animate="show"
    exit="exit"
  >
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">KYC Review</h2>
        <p className="text-xs text-slate-500">
          Verify identity submissions and lock user profiles.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex gap-1 rounded-xl border border-white/5 bg-white/[0.02] p-1">
          {["pending", "approved", "rejected"].map((f) => (
            <button
              key={f}
              onClick={() => onFilterChange(f)}
              className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                filter === f
                  ? "bg-white/[0.06] text-slate-100"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-1.5 text-[11px] font-medium text-slate-300 hover:bg-white/[0.05] disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          Refresh
        </button>
      </div>
    </div>

    <motion.ul
      variants={listContainer}
      initial="hidden"
      animate="show"
      className="grid gap-3 md:grid-cols-2"
    >
      <AnimatePresence initial={false}>
        {requests.map((u) => (
          <motion.li
            key={u._id}
            variants={listItem}
            layout
            exit="exit"
            className="rounded-2xl border border-white/5 bg-slate-900/60 p-4 backdrop-blur-sm"
          >
            <div className="mb-3 flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-400 text-[11px] font-bold text-white">
                {(u.fullName || "?")
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((s) => s[0])
                  .join("")
                  .toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">
                  {u.fullName}{" "}
                  <span className="ml-1 text-xs text-slate-500">
                    @{u.username}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">{u.email}</div>
                {u.trc20Address && (
                  <div className="mt-1 break-all font-mono text-[10px] text-cyan-300">
                    TRC-20: {u.trc20Address}
                  </div>
                )}
              </div>
              <StatusBadge status={u.kyc?.status || "unverified"} />
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-[11px]">
              <div>
                <div className="text-[9px] uppercase tracking-widest text-slate-500">
                  Legal Name
                </div>
                <div className="font-semibold text-slate-200">
                  {u.kyc?.fullName || "—"}
                </div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-widest text-slate-500">
                  Doc Type
                </div>
                <div className="font-semibold text-slate-200">
                  {u.kyc?.docType || "—"}
                </div>
              </div>
              <div className="col-span-2">
                <div className="text-[9px] uppercase tracking-widest text-slate-500">
                  Doc Number
                </div>
                <div className="font-mono font-semibold text-slate-200">
                  {u.kyc?.docNumber || "—"}
                </div>
              </div>
              {u.kyc?.documentPreview && (
                <div className="col-span-2 flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-2 py-1.5 text-[10px] text-slate-400">
                  <FileText className="h-3 w-3" />
                  {u.kyc.documentPreview}
                </div>
              )}
              <div className="col-span-2 flex items-center gap-1 text-[10px] text-slate-500">
                <Clock className="h-3 w-3" />
                Submitted{" "}
                {u.kyc?.submittedAt
                  ? new Date(u.kyc.submittedAt).toLocaleString()
                  : "—"}
              </div>
            </div>

            {u.kyc?.status === "pending" && (
              <div className="mt-3 flex gap-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onReview(u, "approve")}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/15"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onReview(u, "reject")}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-500/15"
                >
                  <X className="h-3.5 w-3.5" /> Reject
                </motion.button>
              </div>
            )}

            {u.kyc?.status !== "pending" && u.kyc?.reviewerNote && (
              <div className="mt-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-[11px] text-slate-400">
                <span className="font-semibold text-slate-300">Note:</span>{" "}
                {u.kyc.reviewerNote}
              </div>
            )}
          </motion.li>
        ))}
      </AnimatePresence>
    </motion.ul>

    {!loading && requests.length === 0 && (
      <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-xs text-slate-500">
        No KYC submissions match this filter.
      </div>
    )}
  </motion.div>
);

// ---------------------------------------------------------------------------
// Main AdminPanel
// ---------------------------------------------------------------------------
export default function AdminPanel({ user, onExit }) {
  const [section, setSection] = useState("overview");
  const [toast, setToast] = useState({ kind: null, message: "" });

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const [codes, setCodes] = useState([]);
  const [codesLoading, setCodesLoading] = useState(false);

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [query, setQuery] = useState("");

  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txFilter, setTxFilter] = useState("pending");

  const [kycRequests, setKycRequests] = useState([]);
  const [kycLoading, setKycLoading] = useState(false);
  const [kycFilter, setKycFilter] = useState("pending");

  const [gatewaySettings, setGatewaySettings] = useState(null);
  const [gatewayLoading, setGatewayLoading] = useState(false);

  const [balanceTarget, setBalanceTarget] = useState(null);
  const [controlRoomUserId, setControlRoomUserId] = useState(null);

  const say = (kind, message) => {
    setToast({ kind, message });
    setTimeout(() => setToast({ kind: null, message: "" }), 2600);
  };

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const res = await AdminAPI.overview();
      setStats(res.stats);
    } catch (err) {
      say("error", err?.message || "Failed to load stats.");
    } finally {
      setStatsLoading(false);
    }
  };

  const loadCodes = async () => {
    setCodesLoading(true);
    try {
      const res = await AdminAPI.listInviteCodes();
      setCodes(res.codes || []);
    } catch (err) {
      say("error", err?.message || "Failed to load codes.");
    } finally {
      setCodesLoading(false);
    }
  };

  const loadUsers = async (q = query) => {
    setUsersLoading(true);
    try {
      const res = await AdminAPI.listUsers(q);
      setUsers(res.users || []);
    } catch (err) {
      say("error", err?.message || "Failed to load users.");
    } finally {
      setUsersLoading(false);
    }
  };

  const loadTransactions = async (filter = txFilter) => {
    setTxLoading(true);
    try {
      const params = filter === "all" ? {} : { status: filter };
      const res = await AdminAPI.listTransactions(params);
      setTransactions(res.transactions || []);
    } catch (err) {
      say("error", err?.message || "Failed to load transactions.");
    } finally {
      setTxLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    loadCodes();
    loadUsers();
    loadTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (section !== "users") return;
    const t = setTimeout(() => loadUsers(query), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, section]);

  useEffect(() => {
    if (section !== "transactions") return;
    loadTransactions(txFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txFilter, section]);

  useEffect(() => {
    if (section !== "kyc") return;
    loadKycRequests(kycFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kycFilter, section]);

  useEffect(() => {
    if (section !== "gateway") return;
    loadGatewaySettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  // Actions
  const handleCreateCode = async (payload) => {
    try {
      const res = await AdminAPI.createInviteCode(payload);
      setCodes((prev) => [res.code, ...prev]);
      say("success", `Code ${res.code.code} created.`);
    } catch (err) {
      say("error", err?.message || "Failed to create code.");
    }
  };

  const handleDeleteCode = async (code) => {
    try {
      await AdminAPI.deleteInviteCode(code._id);
      setCodes((prev) => prev.filter((c) => c._id !== code._id));
      say("success", `Code ${code.code} deleted.`);
    } catch (err) {
      say("error", err?.message || "Failed to delete code.");
    }
  };

  const handleToggleBan = async (u, banned) => {
    try {
      const res = await AdminAPI.toggleBan(
        u._id,
        typeof banned === "boolean" ? banned : undefined
      );
      setUsers((prev) => prev.map((x) => (x._id === u._id ? res.user : x)));
      say("success", res.message || "User updated.");
    } catch (err) {
      say("error", err?.message || "Failed to update user.");
    }
  };

  const handleDeleteUser = async (u) => {
    const ok = window.confirm(
      `Are you sure you want to permanently delete this user?\n\n"${u.fullName || u.username || u.email}"\n\nThis cannot be undone.`
    );
    if (!ok) return;
    try {
      await AdminAPI.deleteUser(u._id);
      setUsers((prev) => prev.filter((x) => x._id !== u._id));
      say("success", "User permanently deleted.");
    } catch (err) {
      say("error", err?.message || "Delete failed.");
    }
  };

  const handleResetPassword = async (u, newPassword) => {
    try {
      const res = await AdminAPI.resetUserPassword(u._id, newPassword);
      say("success", res.message || "Password reset.");
    } catch (err) {
      say("error", err?.message || "Password reset failed.");
      throw err;
    }
  };

  const handleBalanceSubmit = async ({ symbol, mode, amount }) => {
    try {
      const res = await AdminAPI.updateBalance(balanceTarget._id, {
        symbol,
        mode,
        amount,
      });
      setUsers((prev) =>
        prev.map((x) => (x._id === balanceTarget._id ? res.user : x))
      );
      say("success", res.message || "Balance updated.");
      setBalanceTarget(null);
    } catch (err) {
      say("error", err?.message || "Failed to update balance.");
    }
  };

  const handleInlineAdjust = async (target, symbol, amount, mode) => {
    try {
      const res = await AdminAPI.updateBalance(target._id, {
        symbol,
        mode,
        amount,
      });
      setUsers((prev) =>
        prev.map((x) => (x._id === target._id ? res.user : x))
      );
      say(
        "success",
        `${target.fullName || target.username}: ${symbol} balance set to ${amount}.`
      );
    } catch (err) {
      say("error", err?.message || "Failed to update wallet.");
    }
  };

  const handleSaveTradeControl = async (target, state, percentage) => {
    try {
      const res = await AdminAPI.setTradeControl(target._id, {
        state,
        percentage,
      });
      setUsers((prev) =>
        prev.map((x) => (x._id === target._id ? res.user : x))
      );
      say("success", res.message || "Trade control saved.");
    } catch (err) {
      say("error", err?.message || "Failed to save trade control.");
    }
  };

  const handleVerifyTransaction = async (tx, action) => {
    try {
      const res = await AdminAPI.verifyTransaction(tx._id, { action });
      setTransactions((prev) =>
        prev.map((x) => (x._id === tx._id ? res.transaction : x))
      );
      say("success", res.message || `Transaction ${action}d.`);
      // Refresh stats since pending count changed
      loadStats();
    } catch (err) {
      say("error", err?.message || `Failed to ${action}.`);
    }
  };

  const loadKycRequests = async (filter = kycFilter) => {
    setKycLoading(true);
    try {
      const res = await AdminAPI.listKycRequests(filter);
      setKycRequests(res.users || []);
    } catch (err) {
      say("error", err?.message || "Failed to load KYC requests.");
    } finally {
      setKycLoading(false);
    }
  };

  const loadGatewaySettings = async () => {
    setGatewayLoading(true);
    try {
      const res = await AdminAPI.getGatewaySettings();
      setGatewaySettings(res.settings || {});
    } catch (err) {
      say("error", err?.message || "Failed to load gateway settings.");
    } finally {
      setGatewayLoading(false);
    }
  };

  const handleSaveGateway = async (payload) => {
    try {
      const res = await AdminAPI.saveGatewaySettings(payload);
      setGatewaySettings(res.settings || {});
      say("success", res.message || "Gateway settings saved.");
    } catch (err) {
      say("error", err?.message || "Failed to save gateway settings.");
    }
  };

  const handleReviewKyc = async (u, action) => {
    try {
      const res = await AdminAPI.reviewKyc(u._id, { action });
      setKycRequests((prev) => prev.filter((x) => x._id !== u._id));
      say("success", res.message || `KYC ${action}d.`);
    } catch (err) {
      say("error", err?.message || `Failed to ${action} KYC.`);
    }
  };

  const nav = [
    { key: "overview", label: "Overview", icon: LayoutDashboard },
    { key: "codes", label: "Invite Codes", icon: Ticket },
    { key: "users", label: "Users", icon: Users },
    { key: "kyc", label: "KYC Review", icon: BadgeCheck },
    { key: "transactions", label: "Transactions", icon: Receipt },
    { key: "gateway", label: "Gateway Settings", icon: Landmark },
    { key: "chat", label: "Support Chat", icon: MessageSquare },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="relative min-h-screen w-full overflow-hidden bg-[#070915] text-slate-100"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-600/15 blur-3xl" />
        <div className="absolute -right-24 top-1/3 h-[26rem] w-[26rem] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <Toast
        kind={toast.kind}
        message={toast.message}
        onClose={() => setToast({ kind: null, message: "" })}
      />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 border-r border-white/5 bg-slate-900/40 p-5 backdrop-blur-sm md:block">
          <div className="mb-6 flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-400 shadow-lg shadow-indigo-500/25">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">Nexus</div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500">
                Admin Console
              </div>
            </div>
          </div>

          <nav className="space-y-1">
            {nav.map((n) => {
              const active = section === n.key;
              return (
                <motion.button
                  key={n.key}
                  onClick={() => setSection(n.key)}
                  whileTap={{ scale: 0.98 }}
                  className={`relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="admin-nav-pill"
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500/25 to-emerald-400/15 ring-1 ring-white/5"
                    />
                  )}
                  <n.icon
                    className={`relative h-4 w-4 ${
                      active ? "text-emerald-300" : ""
                    }`}
                  />
                  <span className="relative">{n.label}</span>
                </motion.button>
              );
            })}
          </nav>

          <div className="mt-6 border-t border-white/5 pt-4">
            <button
              onClick={onExit}
              className="flex w-full items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/[0.05]"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
            </button>
          </div>

          <div className="mt-6 rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <div className="flex items-center gap-2">
              <div className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-emerald-400 text-[10px] font-bold text-white">
                {user?.initials || user?.username?.[0]?.toUpperCase() || "A"}
              </div>
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold">
                  {user?.fullName}
                </div>
                <div className="truncate text-[10px] text-slate-500">
                  <UserCog className="mr-1 inline h-2.5 w-2.5" />
                  Administrator
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-4 flex flex-wrap gap-2 md:hidden">
            <button
              onClick={onExit}
              className="flex items-center gap-1 rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5 text-[11px] text-slate-300"
            >
              <ArrowLeft className="h-3 w-3" /> Back
            </button>
            {nav.map((n) => (
              <button
                key={n.key}
                onClick={() => setSection(n.key)}
                className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] ${
                  section === n.key
                    ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
                    : "border-white/5 bg-white/[0.02] text-slate-300"
                }`}
              >
                <n.icon className="h-3 w-3" /> {n.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {section === "overview" && (
              <div key="overview">
                <ActiveTradesAlertBar
                  onOpenUser={(id) => {
                    setControlRoomUserId(id);
                    setSection("users");
                  }}
                />
                <OverviewView
                  stats={stats}
                  loading={statsLoading}
                  onRefresh={loadStats}
                />
              </div>
            )}
            {section === "codes" && (
              <InviteCodesView
                key="codes"
                codes={codes}
                loading={codesLoading}
                onRefresh={loadCodes}
                onCreate={handleCreateCode}
                onDelete={handleDeleteCode}
              />
            )}
            {section === "users" &&
              (controlRoomUserId ? (
                <UserControlRoom
                  key={`room-${controlRoomUserId}`}
                  userId={controlRoomUserId}
                  onBack={() => setControlRoomUserId(null)}
                  toast={say}
                />
              ) : (
                <UsersView
                  key="users"
                  users={users}
                  loading={usersLoading}
                  onRefresh={() => loadUsers()}
                  onEditBalance={setBalanceTarget}
                  onInlineAdjust={handleInlineAdjust}
                  onToggleBan={handleToggleBan}
                  onSaveTradeControl={handleSaveTradeControl}
                  onOpenControlRoom={(u) => {
                    setControlRoomUserId(u._id || u.id);
                    setSection("users");
                  }}
                  onDeleteUser={handleDeleteUser}
                  onResetPassword={handleResetPassword}
                  query={query}
                  onQueryChange={setQuery}
                  currentUserId={user?._id || user?.id}
                />
              ))}
            {section === "kyc" && (
              <KycView
                key="kyc"
                requests={kycRequests}
                loading={kycLoading}
                onRefresh={() => loadKycRequests()}
                onReview={handleReviewKyc}
                filter={kycFilter}
                onFilterChange={setKycFilter}
              />
            )}
            {section === "gateway" && (
              <GatewayView
                key="gateway"
                settings={gatewaySettings}
                loading={gatewayLoading}
                onRefresh={loadGatewaySettings}
                onSave={handleSaveGateway}
                updatedAt={gatewaySettings?.updatedAt}
              />
            )}
            {section === "transactions" && (
              <TransactionsView
                key="transactions"
                transactions={transactions}
                loading={txLoading}
                onRefresh={() => loadTransactions()}
                onVerify={handleVerifyTransaction}
                filter={txFilter}
                onFilterChange={setTxFilter}
              />
            )}
            {section === "chat" && (
              <motion.div
                key="chat"
                variants={viewVariants}
                initial="hidden"
                animate="show"
                exit="exit"
              >
                <div className="mb-5">
                  <h2 className="text-lg font-semibold tracking-tight">
                    Support Chat
                  </h2>
                  <p className="text-xs text-slate-500">
                    Live conversations with your users.
                  </p>
                </div>
                <AdminChatManager />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      <BalanceModal
        user={balanceTarget}
        onClose={() => setBalanceTarget(null)}
        onSubmit={handleBalanceSubmit}
      />
    </motion.div>
  );
}
