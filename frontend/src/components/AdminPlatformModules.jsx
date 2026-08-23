/**
 * Platform Modules — simple field editors (no JSON/code for admins).
 */
import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Package,
  Save,
  ImagePlus,
  Pencil,
  X,
} from "lucide-react";
import { PlatformAPI, ChatAPI, assetUrl } from "../lib/api.js";

const KINDS = [
  { id: "loan_plan", label: "Loan Interest" },
  { id: "market_pair", label: "Market Pairs" },
];

function emptyFields(kind) {
  const base = { title: "", subtitle: "", price: "", imageUrl: "" };
  switch (kind) {
    case "nft":
      return { ...base, rarity: "Rare", collection: "equiti" };
    case "c2c_ad":
      return {
        ...base,
        title: "USDT · Buy (USD)",
        price: "1",
        side: "sell",
        asset: "USDT",
        fiat: "USD",
        min: "50",
        max: "50000",
        payment: "Bank Transfer",
        bankName: "",
        accountName: "",
        accountNumber: "",
        iban: "",
        paymentNote: "",
      };
    case "carbon_etf":
      return {
        ...base,
        tier: "Balanced",
        hashRate: "10TH/s",
        cycleDays: "7",
        dailyPct: "1.5",
        earlyExitFeePct: "10",
      };
    case "copy_trader":
      return {
        ...base,
        winRate: "65",
        followers: "100",
        minCopy: "50",
        profitSharePct: "10",
        bio: "",
        equityCsv: "100,104,102,110,115,112,120,128,125,135,140,138,145,150",
        tradesText:
          "BTC/USDT|long|2.4|Breakout\nETH/USDT|short|-0.8|Scalp\nSOL/USDT|long|3.1|Trend",
      };
    case "loan_plan":
      return {
        ...base,
        title: "Standard Loan",
        dailyInterestPct: "0.15",
        interestFreeDays: "0",
        minAmount: "50",
        maxAmount: "50000",
        maxDays: "90",
      };
    case "market_pair":
      return {
        ...base,
        title: "BTC/USDT",
        category: "Crypto",
        base: "BTC",
        quote: "USDT",
      };
    default:
      return base;
  }
}

function itemToFields(it) {
  const m = it.meta || {};
  const base = {
    title: it.title || "",
    subtitle: it.subtitle || "",
    price: String(it.price ?? ""),
    imageUrl: it.imageUrl || "",
  };
  switch (it.kind) {
    case "nft":
      return {
        ...base,
        rarity: m.rarity || "Rare",
        collection: m.collection || "equiti",
      };
    case "c2c_ad":
      return {
        ...base,
        side: m.side || "sell",
        asset: m.asset || "USDT",
        fiat: m.fiat || "USD",
        min: String(m.min ?? 50),
        max: String(m.max ?? 50000),
        payment: m.payment || "Bank Transfer",
        bankName: m.bankName || "",
        accountName: m.accountName || "",
        accountNumber: m.accountNumber || "",
        iban: m.iban || "",
        paymentNote: m.paymentNote || "",
      };
    case "carbon_etf":
      return {
        ...base,
        tier: m.tier || "Balanced",
        hashRate: m.hashRate || "",
        cycleDays: String(m.cycleDays ?? 7),
        dailyPct: String(m.dailyPct ?? 1),
        earlyExitFeePct: String(m.earlyExitFeePct ?? 10),
      };
    case "copy_trader":
      return {
        ...base,
        winRate: String(m.winRate ?? 65),
        followers: String(m.followers ?? 0),
        minCopy: String(m.minCopy ?? 50),
        profitSharePct: String(m.profitSharePct ?? 10),
        bio: m.bio || "",
        equityCsv: Array.isArray(m.equityHistory)
          ? m.equityHistory.join(",")
          : "100,105,110,115,120",
        tradesText: Array.isArray(m.tradeHistory)
          ? m.tradeHistory
              .map(
                (t) =>
                  `${t.pair || "BTC/USDT"}|${t.side || "long"}|${t.pnlPct ?? 0}|${
                    t.note || ""
                  }`
              )
              .join("\n")
          : "",
      };
    case "loan_plan":
      return {
        ...base,
        dailyInterestPct: String(m.dailyInterestPct ?? 0.15),
        interestFreeDays: String(m.interestFreeDays ?? 0),
        minAmount: String(m.minAmount ?? 50),
        maxAmount: String(m.maxAmount ?? 50000),
        maxDays: String(m.maxDays ?? 90),
      };
    case "market_pair":
      return {
        ...base,
        category: m.category || "Crypto",
        base: m.base || "BTC",
        quote: m.quote || "USDT",
      };
    default:
      return base;
  }
}

function fieldsToPayload(kind, f) {
  const price = Number(f.price || 0);
  let meta = {};
  switch (kind) {
    case "nft":
      meta = { rarity: f.rarity, collection: f.collection };
      break;
    case "c2c_ad":
      meta = {
        side: f.side,
        asset: f.asset || "USDT",
        fiat: f.fiat || "USD",
        min: Number(f.min || 50),
        max: Number(f.max || 50000),
        payment: f.payment || "Bank Transfer",
        bankName: f.bankName || "",
        accountName: f.accountName || "",
        accountNumber: f.accountNumber || "",
        iban: f.iban || "",
        paymentNote: f.paymentNote || "",
      };
      break;
    case "carbon_etf":
      meta = {
        tier: f.tier,
        hashRate: f.hashRate,
        cycleDays: Number(f.cycleDays || 7),
        dailyPct: Number(f.dailyPct || 0),
        earlyExitFeePct: Number(f.earlyExitFeePct || 0),
      };
      break;
    case "copy_trader": {
      const equityHistory = String(f.equityCsv || "")
        .split(/[,\s]+/)
        .map((n) => Number(n))
        .filter((n) => Number.isFinite(n));
      const tradeHistory = String(f.tradesText || "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [pair, side, pnlPct, note] = line.split("|").map((s) => s.trim());
          return {
            pair: pair || "BTC/USDT",
            side: side || "long",
            pnlPct: Number(pnlPct || 0),
            note: note || "",
          };
        });
      meta = {
        winRate: Number(f.winRate || 0),
        followers: Number(f.followers || 0),
        minCopy: Number(f.minCopy || 0),
        profitSharePct: Number(f.profitSharePct || 0),
        bio: f.bio || "",
        equityHistory: equityHistory.length
          ? equityHistory
          : [100, 105, 110, 115, 120],
        tradeHistory,
      };
      break;
    }
    case "loan_plan":
      meta = {
        dailyInterestPct: Number(f.dailyInterestPct || 0),
        interestFreeDays: Number(f.interestFreeDays || 0),
        minAmount: Number(f.minAmount || 50),
        maxAmount: Number(f.maxAmount || 50000),
        maxDays: Number(f.maxDays || 90),
      };
      break;
    case "market_pair":
      meta = {
        category: f.category || "Crypto",
        base: f.base || "BTC",
        quote: f.quote || "USDT",
      };
      break;
    default:
      break;
  }
  return {
    kind,
    title: f.title,
    subtitle: f.subtitle,
    price,
    imageUrl: f.imageUrl || null,
    meta,
    enabled: true,
  };
}

function Field({ label, children }) {
  return (
    <label className="block text-[11px]">
      <span className="mb-1 block font-semibold text-slate-400">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-lg border border-white/10 bg-[#0c1222] px-3 py-2 text-xs text-white outline-none focus:border-cyan-400/40";

function KindFields({ kind, form, setForm }) {
  const set = (k, v) => setForm({ ...form, [k]: v });

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <Field label="Name / Title">
          <input className={inputCls} value={form.title} onChange={(e) => set("title", e.target.value)} />
        </Field>
        <Field label="Subtitle">
          <input className={inputCls} value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)} />
        </Field>
        <Field label={kind === "c2c_ad" ? "Rate (price)" : "Price (USDT)"}>
          <input className={inputCls} type="number" step="any" value={form.price} onChange={(e) => set("price", e.target.value)} />
        </Field>
      </div>

      {(kind === "nft" || kind === "copy_trader") && (
        <Field label="Image URL">
          <input className={inputCls} value={form.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} placeholder="Or use Upload pic" />
        </Field>
      )}

      {kind === "nft" && (
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="Rarity">
            <input className={inputCls} value={form.rarity} onChange={(e) => set("rarity", e.target.value)} />
          </Field>
          <Field label="Collection">
            <input className={inputCls} value={form.collection} onChange={(e) => set("collection", e.target.value)} />
          </Field>
        </div>
      )}

      {kind === "c2c_ad" && (
        <div className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-3">
            <Field label="Side (merchant)">
              <select className={inputCls} value={form.side} onChange={(e) => set("side", e.target.value)}>
                <option value="sell">sell = User Buy USDT</option>
                <option value="buy">buy = User Sell USDT</option>
              </select>
            </Field>
            <Field label="Fiat">
              <input className={inputCls} value={form.fiat} onChange={(e) => set("fiat", e.target.value)} />
            </Field>
            <Field label="Payment method">
              <input className={inputCls} value={form.payment} onChange={(e) => set("payment", e.target.value)} placeholder="Bank Transfer / JazzCash / EasyPaisa" />
            </Field>
            <Field label="Min limit (fiat)">
              <input className={inputCls} type="number" value={form.min} onChange={(e) => set("min", e.target.value)} />
            </Field>
            <Field label="Max limit (fiat)">
              <input className={inputCls} type="number" value={form.max} onChange={(e) => set("max", e.target.value)} />
            </Field>
            <Field label="Asset">
              <input className={inputCls} value={form.asset} onChange={(e) => set("asset", e.target.value)} />
            </Field>
          </div>
          <p className="text-[11px] text-slate-500">
            Rate field above = fiat per 1 {form.asset || "USDT"}. Add as many ads as you want (10 or 100). Payment details below show on the user C2C desk.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Bank / wallet name">
              <input className={inputCls} value={form.bankName} onChange={(e) => set("bankName", e.target.value)} placeholder="HBL / JazzCash" />
            </Field>
            <Field label="Account holder name">
              <input className={inputCls} value={form.accountName} onChange={(e) => set("accountName", e.target.value)} />
            </Field>
            <Field label="Account / phone number">
              <input className={inputCls} value={form.accountNumber} onChange={(e) => set("accountNumber", e.target.value)} />
            </Field>
            <Field label="IBAN (optional)">
              <input className={inputCls} value={form.iban} onChange={(e) => set("iban", e.target.value)} />
            </Field>
          </div>
          <Field label="Payment note for users">
            <input className={inputCls} value={form.paymentNote} onChange={(e) => set("paymentNote", e.target.value)} placeholder="Transfer exact amount and keep receipt" />
          </Field>
        </div>
      )}

      {kind === "carbon_etf" && (
        <div className="grid gap-2 sm:grid-cols-3">
          <Field label="Tier name">
            <input className={inputCls} value={form.tier} onChange={(e) => set("tier", e.target.value)} />
          </Field>
          <Field label="Hash rate text">
            <input className={inputCls} value={form.hashRate} onChange={(e) => set("hashRate", e.target.value)} />
          </Field>
          <Field label="Cycle days">
            <input className={inputCls} type="number" value={form.cycleDays} onChange={(e) => set("cycleDays", e.target.value)} />
          </Field>
          <Field label="Daily dividend %">
            <input className={inputCls} type="number" step="any" value={form.dailyPct} onChange={(e) => set("dailyPct", e.target.value)} />
          </Field>
          <Field label="Early exit fee %">
            <input className={inputCls} type="number" step="any" value={form.earlyExitFeePct} onChange={(e) => set("earlyExitFeePct", e.target.value)} />
          </Field>
        </div>
      )}

      {kind === "copy_trader" && (
        <div className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-4">
            <Field label="Win rate %">
              <input className={inputCls} type="number" value={form.winRate} onChange={(e) => set("winRate", e.target.value)} />
            </Field>
            <Field label="Followers">
              <input className={inputCls} type="number" value={form.followers} onChange={(e) => set("followers", e.target.value)} />
            </Field>
            <Field label="Min copy $">
              <input className={inputCls} type="number" value={form.minCopy} onChange={(e) => set("minCopy", e.target.value)} />
            </Field>
            <Field label="Profit share %">
              <input className={inputCls} type="number" value={form.profitSharePct} onChange={(e) => set("profitSharePct", e.target.value)} />
            </Field>
          </div>
          <Field label="Bio (shown to user)">
            <input className={inputCls} value={form.bio} onChange={(e) => set("bio", e.target.value)} />
          </Field>
          <Field label="Equity graph numbers (comma separated)">
            <input className={inputCls} value={form.equityCsv} onChange={(e) => set("equityCsv", e.target.value)} placeholder="100,105,110,120" />
          </Field>
          <Field label="Trade history (one per line: PAIR|side|pnl%|note)">
            <textarea
              className={`${inputCls} h-24 font-mono`}
              value={form.tradesText}
              onChange={(e) => set("tradesText", e.target.value)}
              spellCheck={false}
            />
          </Field>
        </div>
      )}

      {kind === "loan_plan" && (
        <div className="grid gap-2 sm:grid-cols-3">
          <Field label="Daily interest % (e.g. 0.15 or 2)">
            <input className={inputCls} type="number" step="any" value={form.dailyInterestPct} onChange={(e) => set("dailyInterestPct", e.target.value)} />
          </Field>
          <Field label="Interest-free days">
            <input className={inputCls} type="number" value={form.interestFreeDays} onChange={(e) => set("interestFreeDays", e.target.value)} />
          </Field>
          <Field label="Max term days">
            <input className={inputCls} type="number" value={form.maxDays} onChange={(e) => set("maxDays", e.target.value)} />
          </Field>
          <Field label="Min amount $">
            <input className={inputCls} type="number" value={form.minAmount} onChange={(e) => set("minAmount", e.target.value)} />
          </Field>
          <Field label="Max amount $">
            <input className={inputCls} type="number" value={form.maxAmount} onChange={(e) => set("maxAmount", e.target.value)} />
          </Field>
        </div>
      )}

      {kind === "market_pair" && (
        <div className="grid gap-2 sm:grid-cols-3">
          <Field label="Category">
            <select className={inputCls} value={form.category} onChange={(e) => set("category", e.target.value)}>
              <option>Crypto</option>
              <option>Forex</option>
            </select>
          </Field>
          <Field label="Base">
            <input className={inputCls} value={form.base} onChange={(e) => set("base", e.target.value)} />
          </Field>
          <Field label="Quote">
            <input className={inputCls} value={form.quote} onChange={(e) => set("quote", e.target.value)} />
          </Field>
        </div>
      )}
    </div>
  );
}

export default function AdminPlatformModules({ toast }) {
  const [tab, setTab] = useState("catalog");
  const [kind, setKind] = useState("loan_plan");
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [borrowers, setBorrowers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(() => emptyFields("loan_plan"));
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [uploading, setUploading] = useState(null);
  const say = toast || (() => {});

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const res = await PlatformAPI.adminCatalog(kind);
      setItems(res.items || []);
    } catch (err) {
      say("error", err?.message || "Failed to load catalog.");
    } finally {
      setLoading(false);
    }
  }, [kind]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await PlatformAPI.adminOrders({});
      setOrders(res.orders || []);
    } catch (err) {
      say("error", err?.message || "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBorrowers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await PlatformAPI.adminBorrowerKyc("pending");
      setBorrowers(res.users || []);
    } catch (err) {
      say("error", err?.message || "Failed to load borrower KYC.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "catalog") loadCatalog();
    if (tab === "orders") loadOrders();
    if (tab === "borrower") loadBorrowers();
  }, [tab, loadCatalog, loadOrders, loadBorrowers]);

  useEffect(() => {
    setForm(emptyFields(kind));
    setEditId(null);
    setEditForm(null);
  }, [kind]);

  const createItem = async () => {
    if (!form.title.trim()) {
      say("error", "Enter a name/title.");
      return;
    }
    try {
      await PlatformAPI.adminCreateCatalog(fieldsToPayload(kind, form));
      say("success", "Added.");
      setForm(emptyFields(kind));
      loadCatalog();
    } catch (err) {
      say("error", err?.message || "Create failed.");
    }
  };

  const saveEdit = async () => {
    if (!editId || !editForm) return;
    try {
      await PlatformAPI.adminUpdateCatalog(editId, fieldsToPayload(kind, editForm));
      say("success", "Saved.");
      setEditId(null);
      setEditForm(null);
      loadCatalog();
    } catch (err) {
      say("error", err?.message || "Update failed.");
    }
  };

  const uploadImage = async (itemId, file) => {
    if (!file) return;
    setUploading(itemId || "new");
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      try {
        const fd = new FormData();
        fd.append("image", file);
        const res = await ChatAPI.uploadImage(fd);
        const url = res.url || res.path || res.imageUrl || dataUrl;
        if (itemId) {
          await PlatformAPI.adminUpdateCatalog(itemId, { imageUrl: url });
          loadCatalog();
        } else if (editForm) {
          setEditForm({ ...editForm, imageUrl: url });
        } else {
          setForm({ ...form, imageUrl: url });
        }
        say("success", "Picture saved.");
      } catch {
        if (itemId) {
          await PlatformAPI.adminUpdateCatalog(itemId, { imageUrl: dataUrl });
          loadCatalog();
        } else {
          setForm({ ...form, imageUrl: dataUrl });
        }
        say("success", "Picture saved.");
      }
    } catch (err) {
      say("error", err?.message || "Upload failed.");
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Package className="h-4 w-4 text-cyan-300" />
        <h2 className="text-lg font-semibold">Platform Modules</h2>
        <span className="text-[11px] text-slate-500">
          Simple edit — no code. Pick a section, fill fields, Save.
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ["catalog", "Catalog"],
          ["orders", "User Orders"],
          ["borrower", "Borrower KYC"],
        ].map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
              tab === k
                ? "border-cyan-400/30 bg-cyan-500/15 text-cyan-200"
                : "border-white/10 text-slate-400"
            }`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            if (tab === "catalog") loadCatalog();
            if (tab === "orders") loadOrders();
            if (tab === "borrower") loadBorrowers();
          }}
          className="ml-auto inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-300"
        >
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>

      {tab === "catalog" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {KINDS.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => setKind(k.id)}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold ${
                  kind === k.id
                    ? "bg-emerald-500/20 text-emerald-200"
                    : "bg-white/5 text-slate-400"
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
              Add new · {KINDS.find((k) => k.id === kind)?.label}
            </div>
            <KindFields kind={kind} form={form} setForm={setForm} />
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-[11px] font-semibold text-cyan-200">
                <ImagePlus className="h-3.5 w-3.5" />
                {uploading === "new" ? "…" : "Upload pic"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => uploadImage(null, e.target.files?.[0])}
                />
              </label>
              <button
                type="button"
                onClick={createItem}
                className="inline-flex items-center gap-1 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950"
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-cyan-300" />
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((it) => (
                <div
                  key={it._id}
                  className="rounded-xl border border-white/10 bg-[#0c1222] px-3 py-2.5"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    {it.imageUrl ? (
                      <img
                        src={assetUrl(it.imageUrl) || it.imageUrl}
                        alt=""
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="grid h-12 w-12 place-items-center rounded-lg bg-white/5 text-[10px] text-slate-500">
                        —
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-white">{it.title}</div>
                      <div className="text-[11px] text-slate-500">
                        ${Number(it.price || 0)} · {it.enabled ? "ON" : "OFF"}
                        {it.meta?.dailyInterestPct != null
                          ? ` · interest ${it.meta.dailyInterestPct}%/d`
                          : ""}
                        {it.meta?.dailyPct != null
                          ? ` · dividend ${it.meta.dailyPct}%`
                          : ""}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (editId === it._id) {
                          setEditId(null);
                          setEditForm(null);
                        } else {
                          setEditId(it._id);
                          setEditForm(itemToFields(it));
                        }
                      }}
                      className="rounded-lg border border-white/10 px-2 py-1 text-[11px] text-cyan-200"
                    >
                      <Pencil className="inline h-3 w-3" /> Edit
                    </button>
                    <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[11px] text-slate-300">
                      {uploading === it._id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <ImagePlus className="h-3 w-3" />
                      )}
                      Pic
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => uploadImage(it._id, e.target.files?.[0])}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={async () => {
                        await PlatformAPI.adminUpdateCatalog(it._id, {
                          enabled: !it.enabled,
                        });
                        loadCatalog();
                      }}
                      className="rounded-lg border border-white/10 px-2 py-1 text-[11px] text-slate-300"
                    >
                      {it.enabled ? "Disable" : "Enable"}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm("Delete?")) return;
                        await PlatformAPI.adminDeleteCatalog(it._id);
                        say("success", "Deleted.");
                        loadCatalog();
                      }}
                      className="rounded-lg p-1.5 text-rose-300 hover:bg-rose-500/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {editId === it._id && editForm && (
                    <div className="mt-3 space-y-3 border-t border-white/5 pt-3">
                      <KindFields kind={kind} form={editForm} setForm={setEditForm} />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={saveEdit}
                          className="inline-flex items-center gap-1 rounded-lg bg-teal-400 px-3 py-1.5 text-[11px] font-bold text-slate-950"
                        >
                          <Save className="h-3 w-3" /> Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditId(null);
                            setEditForm(null);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-[11px] text-slate-300"
                        >
                          <X className="h-3 w-3" /> Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {!items.length && (
                <div className="py-8 text-center text-sm text-slate-500">
                  No items yet — use Add above.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "orders" && (
        <div className="space-y-2">
          {orders.map((o) => {
            const m = o.meta || {};
            const isC2c = o.kind === "c2c";
            const canAct = ["pending", "active"].includes(o.status);
            return (
              <div
                key={o._id}
                className="flex flex-wrap items-start gap-3 rounded-xl border border-white/10 bg-[#0c1222] px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white">
                    {o.kind}
                    {isC2c ? ` · ${o.side || "?"}` : ""} ·{" "}
                    {o.user?.username || o.user?.email || "user"}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {isC2c
                      ? `${Number(m.fiatAmount || o.amount || 0)} ${m.fiat || ""} → ${Number(
                          m.usdtAmount || 0
                        ).toFixed(4)} USDT @ ${m.rate || o.amount} · ${o.status}${
                          m.paidAt ? " · user paid" : ""
                        }`
                      : `$${Number(o.amount || 0)} · ${o.status}`}
                  </div>
                  {isC2c && o.side === "sell" && (
                    <div className="mt-1 text-[11px] text-amber-200/80">
                      Pay user: {m.userBankName || "—"} · {m.userAccountName || "—"} ·{" "}
                      {m.userAccountNumber || "—"}
                    </div>
                  )}
                  {isC2c && o.side === "buy" && m.paymentRef && (
                    <div className="mt-1 text-[11px] text-cyan-200/80">
                      Payment ref: {m.paymentRef}
                    </div>
                  )}
                </div>
                {canAct && (
                  <>
                    <button
                      type="button"
                      onClick={async () => {
                        await PlatformAPI.adminReviewOrder(o._id, {
                          status: isC2c ? "completed" : "active",
                        });
                        say(
                          "success",
                          isC2c ? "C2C settled." : "Approved."
                        );
                        loadOrders();
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/20 px-2 py-1 text-[11px] text-emerald-200"
                    >
                      <CheckCircle2 className="h-3 w-3" />{" "}
                      {isC2c ? "Confirm release" : "Approve"}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await PlatformAPI.adminReviewOrder(o._id, {
                          status: "rejected",
                        });
                        say("success", "Rejected.");
                        loadOrders();
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-rose-500/20 px-2 py-1 text-[11px] text-rose-200"
                    >
                      <XCircle className="h-3 w-3" /> Reject
                    </button>
                  </>
                )}
              </div>
            );
          })}
          {!orders.length && !loading && (
            <div className="py-8 text-center text-sm text-slate-500">No orders.</div>
          )}
        </div>
      )}

      {tab === "borrower" && (
        <div className="space-y-2">
          {borrowers.map((u) => (
            <div
              key={u._id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0c1222] px-3 py-3"
            >
              <div>
                <div className="text-sm font-semibold text-white">
                  {u.fullName || u.username}
                </div>
                <div className="text-[11px] text-slate-500">{u.email}</div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await PlatformAPI.adminReviewBorrower(u._id, {
                      action: "approve",
                    });
                    loadBorrowers();
                  }}
                  className="rounded-lg bg-emerald-500 px-3 py-1.5 text-[11px] font-bold text-slate-950"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await PlatformAPI.adminReviewBorrower(u._id, {
                      action: "reject",
                    });
                    loadBorrowers();
                  }}
                  className="rounded-lg border border-rose-400/30 px-3 py-1.5 text-[11px] text-rose-300"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
          {!borrowers.length && !loading && (
            <div className="py-8 text-center text-sm text-slate-500">
              No pending borrower KYC.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
