/**
 * Admin control for CXM platform catalog — full edit of prices, meta, images.
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
  "nft",
  "c2c_ad",
  "carbon_etf",
  "copy_trader",
  "loan_plan",
  "market_pair",
];

const META_TEMPLATES = {
  nft: { rarity: "Rare", collection: "Nexus" },
  c2c_ad: {
    side: "sell",
    asset: "USDT",
    fiat: "USD",
    min: 50,
    max: 50000,
    payment: "Merchant Deposit",
  },
  carbon_etf: {
    tier: "Balanced",
    hashRate: "10TH/s",
    cycleDays: 7,
    dailyPct: 1.5,
    earlyExitFeePct: 10,
  },
  copy_trader: {
    winRate: 65,
    followers: 100,
    minCopy: 50,
    profitSharePct: 10,
    bio: "Professional desk",
    equityHistory: [100, 104, 102, 110, 115, 112, 120, 128, 125, 135],
    tradeHistory: [
      { pair: "BTC/USDT", side: "long", pnlPct: 2.4, note: "Breakout long" },
      { pair: "ETH/USDT", side: "short", pnlPct: -0.8, note: "Scalp" },
      { pair: "SOL/USDT", side: "long", pnlPct: 3.1, note: "Trend follow" },
    ],
  },
  loan_plan: {
    dailyInterestPct: 0.15,
    interestFreeDays: 0,
    minAmount: 50,
    maxAmount: 50000,
    maxDays: 90,
  },
  market_pair: { category: "Crypto", base: "BTC", quote: "USDT" },
};

function metaToText(meta) {
  try {
    return JSON.stringify(meta || {}, null, 2);
  } catch {
    return "{}";
  }
}

function parseMeta(text) {
  try {
    const v = JSON.parse(text || "{}");
    return typeof v === "object" && v ? v : {};
  } catch {
    return null;
  }
}

export default function AdminPlatformModules({ toast }) {
  const [tab, setTab] = useState("catalog");
  const [kind, setKind] = useState("nft");
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [borrowers, setBorrowers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    price: "",
    imageUrl: "",
    metaText: metaToText(META_TEMPLATES.nft),
  });
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
    setForm({
      title: "",
      subtitle: "",
      price: "",
      imageUrl: "",
      metaText: metaToText(META_TEMPLATES[kind] || {}),
    });
    setEditId(null);
    setEditForm(null);
  }, [kind]);

  const createItem = async () => {
    const meta = parseMeta(form.metaText);
    if (!meta) {
      say("error", "Meta JSON is invalid.");
      return;
    }
    try {
      await PlatformAPI.adminCreateCatalog({
        kind,
        title: form.title,
        subtitle: form.subtitle,
        price: Number(form.price || 0),
        imageUrl: form.imageUrl || null,
        enabled: true,
        meta,
      });
      say("success", "Catalog item created.");
      setForm({
        title: "",
        subtitle: "",
        price: "",
        imageUrl: "",
        metaText: metaToText(META_TEMPLATES[kind] || {}),
      });
      loadCatalog();
    } catch (err) {
      say("error", err?.message || "Create failed.");
    }
  };

  const startEdit = (it) => {
    setEditId(it._id);
    setEditForm({
      title: it.title || "",
      subtitle: it.subtitle || "",
      price: String(it.price ?? ""),
      imageUrl: it.imageUrl || "",
      metaText: metaToText(it.meta || META_TEMPLATES[it.kind] || {}),
      enabled: it.enabled !== false,
    });
  };

  const saveEdit = async () => {
    if (!editId || !editForm) return;
    const meta = parseMeta(editForm.metaText);
    if (!meta) {
      say("error", "Meta JSON is invalid.");
      return;
    }
    try {
      await PlatformAPI.adminUpdateCatalog(editId, {
        title: editForm.title,
        subtitle: editForm.subtitle,
        price: Number(editForm.price || 0),
        imageUrl: editForm.imageUrl || null,
        enabled: editForm.enabled,
        meta,
      });
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
      const fd = new FormData();
      fd.append("image", file);
      const res = await ChatAPI.uploadImage(fd);
      const url = res.url || res.path || res.imageUrl || res.data?.url;
      if (!url) throw new Error("Upload returned no URL.");
      if (itemId) {
        await PlatformAPI.adminUpdateCatalog(itemId, { imageUrl: url });
        say("success", "Image uploaded.");
        loadCatalog();
      } else {
        setForm((f) => ({ ...f, imageUrl: url }));
        say("success", "Image ready — create the item.");
      }
    } catch (err) {
      // fallback: base64 data URL stored in imageUrl
      try {
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        if (itemId) {
          await PlatformAPI.adminUpdateCatalog(itemId, { imageUrl: dataUrl });
          say("success", "Image saved.");
          loadCatalog();
        } else {
          setForm((f) => ({ ...f, imageUrl: dataUrl }));
          say("success", "Image ready — create the item.");
        }
      } catch {
        say("error", err?.message || "Image upload failed.");
      }
    } finally {
      setUploading(null);
    }
  };

  const clearImage = async (itemId) => {
    try {
      await PlatformAPI.adminUpdateCatalog(itemId, { imageUrl: null });
      say("success", "Image removed.");
      loadCatalog();
    } catch (err) {
      say("error", err?.message || "Failed to remove image.");
    }
  };

  const toggleEnabled = async (it) => {
    try {
      await PlatformAPI.adminUpdateCatalog(it._id, { enabled: !it.enabled });
      loadCatalog();
    } catch (err) {
      say("error", err?.message || "Update failed.");
    }
  };

  const removeItem = async (id) => {
    if (!confirm("Delete this catalog item?")) return;
    try {
      await PlatformAPI.adminDeleteCatalog(id);
      say("success", "Deleted.");
      loadCatalog();
    } catch (err) {
      say("error", err?.message || "Delete failed.");
    }
  };

  const reviewOrder = async (id, status) => {
    try {
      await PlatformAPI.adminReviewOrder(id, { status });
      say("success", `Order ${status}.`);
      loadOrders();
    } catch (err) {
      say("error", err?.message || "Review failed.");
    }
  };

  const reviewBorrower = async (userId, action) => {
    try {
      await PlatformAPI.adminReviewBorrower(userId, { action });
      say("success", `Borrower KYC ${action}d.`);
      loadBorrowers();
    } catch (err) {
      say("error", err?.message || "Review failed.");
    }
  };

  const kindHint = {
    nft: "Edit title, price, image. Meta: rarity, collection.",
    c2c_ad: "Edit price (rate). Meta: side, fiat, min, max, payment.",
    carbon_etf: "Edit name, price, dailyPct, cycleDays, hashRate in meta.",
    copy_trader:
      "Edit name + meta.winRate, profitSharePct, equityHistory[], tradeHistory[].",
    loan_plan:
      "Edit meta.dailyInterestPct (e.g. 0.15 = 0.15%/day), min/max amount, maxDays.",
    market_pair: "Edit pair title + meta.category / base / quote.",
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Package className="h-4 w-4 text-cyan-300" />
        <h2 className="text-lg font-semibold">Platform Modules</h2>
        <span className="text-[11px] text-slate-500">
          NFT · C2C rates · Carbon ETF · Copy Trade · Loan interest
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
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-medium ${
                  kind === k
                    ? "bg-emerald-500/20 text-emerald-200"
                    : "bg-white/5 text-slate-400"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-500">{kindHint[kind]}</p>

          <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <div className="grid gap-2 sm:grid-cols-3">
              <input
                className="rounded-lg border border-white/10 bg-[#0c1222] px-3 py-2 text-xs"
                placeholder="Title / Name"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <input
                className="rounded-lg border border-white/10 bg-[#0c1222] px-3 py-2 text-xs"
                placeholder="Subtitle"
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              />
              <input
                className="rounded-lg border border-white/10 bg-[#0c1222] px-3 py-2 text-xs"
                placeholder="Price USDT / Rate"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#0c1222] px-3 py-2 text-xs"
                placeholder="Image URL (or upload)"
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              />
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
            </div>
            <textarea
              className="h-28 w-full rounded-lg border border-white/10 bg-[#0c1222] px-3 py-2 font-mono text-[11px] text-slate-300"
              value={form.metaText}
              onChange={(e) => setForm({ ...form, metaText: e.target.value })}
              spellCheck={false}
            />
            <button
              type="button"
              onClick={createItem}
              className="inline-flex items-center justify-center gap-1 rounded-lg bg-cyan-500 px-3 py-2 text-xs font-bold text-slate-950"
            >
              <Plus className="h-3.5 w-3.5" /> Add {kind}
            </button>
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
                        No img
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-white">
                        {it.title}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {it.kind} · ${Number(it.price || 0)} ·{" "}
                        {it.enabled ? "ON" : "OFF"}
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
                      onClick={() =>
                        editId === it._id
                          ? (setEditId(null), setEditForm(null))
                          : startEdit(it)
                      }
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
                        onChange={(e) =>
                          uploadImage(it._id, e.target.files?.[0])
                        }
                      />
                    </label>
                    {it.imageUrl && (
                      <button
                        type="button"
                        onClick={() => clearImage(it._id)}
                        className="rounded-lg border border-white/10 px-2 py-1 text-[11px] text-amber-200"
                      >
                        Clear pic
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleEnabled(it)}
                      className="rounded-lg border border-white/10 px-2 py-1 text-[11px] text-slate-300"
                    >
                      {it.enabled ? "Disable" : "Enable"}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(it._id)}
                      className="rounded-lg p-1.5 text-rose-300 hover:bg-rose-500/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {editId === it._id && editForm && (
                    <div className="mt-3 space-y-2 border-t border-white/5 pt-3">
                      <div className="grid gap-2 sm:grid-cols-3">
                        <input
                          className="rounded-lg border border-white/10 bg-[#070a12] px-2 py-1.5 text-xs"
                          value={editForm.title}
                          onChange={(e) =>
                            setEditForm({ ...editForm, title: e.target.value })
                          }
                        />
                        <input
                          className="rounded-lg border border-white/10 bg-[#070a12] px-2 py-1.5 text-xs"
                          value={editForm.subtitle}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              subtitle: e.target.value,
                            })
                          }
                        />
                        <input
                          className="rounded-lg border border-white/10 bg-[#070a12] px-2 py-1.5 text-xs"
                          value={editForm.price}
                          onChange={(e) =>
                            setEditForm({ ...editForm, price: e.target.value })
                          }
                          placeholder="Price / rate"
                        />
                      </div>
                      <input
                        className="w-full rounded-lg border border-white/10 bg-[#070a12] px-2 py-1.5 text-xs"
                        value={editForm.imageUrl}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            imageUrl: e.target.value,
                          })
                        }
                        placeholder="Image URL"
                      />
                      <textarea
                        className="h-36 w-full rounded-lg border border-white/10 bg-[#070a12] px-2 py-1.5 font-mono text-[11px]"
                        value={editForm.metaText}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            metaText: e.target.value,
                          })
                        }
                        spellCheck={false}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={saveEdit}
                          className="inline-flex items-center gap-1 rounded-lg bg-teal-400 px-3 py-1.5 text-[11px] font-bold text-slate-950"
                        >
                          <Save className="h-3 w-3" /> Save changes
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
                  No items for this kind yet.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "orders" && (
        <div className="space-y-2">
          {orders.map((o) => (
            <div
              key={o._id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-[#0c1222] px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-white">
                  {o.kind} · {o.user?.username || o.user?.email || "user"}
                </div>
                <div className="text-[11px] text-slate-500">
                  ${Number(o.amount || 0)} · {o.status} ·{" "}
                  {o.catalog?.title || o.symbol || "—"}
                </div>
              </div>
              {o.status === "pending" && (
                <>
                  <button
                    type="button"
                    onClick={() => reviewOrder(o._id, "active")}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/20 px-2 py-1 text-[11px] text-emerald-200"
                  >
                    <CheckCircle2 className="h-3 w-3" /> Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => reviewOrder(o._id, "rejected")}
                    className="inline-flex items-center gap-1 rounded-lg bg-rose-500/20 px-2 py-1 text-[11px] text-rose-200"
                  >
                    <XCircle className="h-3 w-3" /> Reject
                  </button>
                </>
              )}
            </div>
          ))}
          {!orders.length && !loading && (
            <div className="py-8 text-center text-sm text-slate-500">
              No platform orders yet.
            </div>
          )}
        </div>
      )}

      {tab === "borrower" && (
        <div className="space-y-2">
          {borrowers.map((u) => (
            <div
              key={u._id}
              className="rounded-xl border border-white/10 bg-[#0c1222] px-3 py-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white">
                    {u.fullName || u.username}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {u.email} · ID: {u.borrowerKyc?.idType}{" "}
                    {u.borrowerKyc?.idNumber}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => reviewBorrower(u._id, "approve")}
                    className="rounded-lg bg-emerald-500 px-3 py-1.5 text-[11px] font-bold text-slate-950"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => reviewBorrower(u._id, "reject")}
                    className="rounded-lg border border-rose-400/30 px-3 py-1.5 text-[11px] text-rose-300"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!borrowers.length && !loading && (
            <div className="py-8 text-center text-sm text-slate-500">
              No pending borrower verifications.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
