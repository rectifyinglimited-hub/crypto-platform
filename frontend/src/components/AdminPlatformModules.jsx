/**
 * Admin control for CXM platform catalog, orders, borrower KYC.
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
} from "lucide-react";
import { PlatformAPI } from "../lib/api.js";

const KINDS = [
  "carbon_etf",
  "ico",
  "nft",
  "copy_trader",
  "ai_compute",
  "loan_plan",
  "c2c_ad",
  "market_pair",
];

export default function AdminPlatformModules({ toast }) {
  const [tab, setTab] = useState("catalog");
  const [kind, setKind] = useState("carbon_etf");
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [borrowers, setBorrowers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    price: "",
    kind: "carbon_etf",
  });

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

  const createItem = async () => {
    try {
      await PlatformAPI.adminCreateCatalog({
        kind: form.kind || kind,
        title: form.title,
        subtitle: form.subtitle,
        price: Number(form.price || 0),
        enabled: true,
        meta: {},
      });
      say("success", "Catalog item created.");
      setForm({ title: "", subtitle: "", price: "", kind: kind });
      loadCatalog();
    } catch (err) {
      say("error", err?.message || "Create failed.");
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Package className="h-4 w-4 text-cyan-300" />
        <h2 className="text-lg font-semibold">Platform Modules</h2>
        <span className="text-[11px] text-slate-500">
          Control ETF · ICO · NFT · Copy · Loan · C2C · Market
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

          <div className="grid gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3 sm:grid-cols-4">
            <input
              className="rounded-lg border border-white/10 bg-[#0c1222] px-3 py-2 text-xs"
              placeholder="Title"
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
              placeholder="Price USDT"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
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
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-[#0c1222] px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-white">
                      {it.title}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {it.kind} · ${Number(it.price || 0)} ·{" "}
                      {it.enabled ? "ON" : "OFF"}
                    </div>
                  </div>
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
                  <div className="mt-1 text-[11px] text-slate-400">
                    {u.borrowerKyc?.firstName} {u.borrowerKyc?.lastName} ·{" "}
                    {u.borrowerKyc?.country} · {u.borrowerKyc?.phone}
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
