/**
 * Global merchant deposit panel — rails from admin Gateway.
 * Opens Live Chat so the user can send deposit screenshots.
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDownToLine, Copy, Loader2, MessageCircle, Send } from "lucide-react";
import { GatewayAPI, WalletAPI } from "../lib/api.js";

function GatewayField({ label, value, onCopy }) {
  if (!value) return null;
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
      <div className="mb-1 flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-emerald-300">
          {label}
        </div>
        <button
          type="button"
          onClick={() => onCopy(value, label)}
          className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-1 text-emerald-200 hover:bg-emerald-500/15"
        >
          <Copy className="h-3 w-3" />
        </button>
      </div>
      <code className="block break-all rounded-lg bg-black/30 px-2 py-1.5 font-mono text-[11px] text-emerald-100">
        {value}
      </code>
    </div>
  );
}

export default function DepositSection({ toast, onOpenLiveChat }) {
  const [symbol, setSymbol] = useState("USDT");
  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [gateway, setGateway] = useState(null);
  const [gwLoading, setGwLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setGwLoading(true);
    GatewayAPI.current()
      .then((r) => {
        if (!cancelled) setGateway(r.settings || {});
      })
      .catch(() => {
        if (!cancelled) setGateway({});
      })
      .finally(() => {
        if (!cancelled) setGwLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-open Live Chat when user lands on Deposit
  useEffect(() => {
    onOpenLiveChat?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copy = (value, label) => {
    try {
      navigator.clipboard?.writeText(value);
      toast?.("success", `${label} copied.`);
    } catch {
      /* ignore */
    }
  };

  const railList = Array.isArray(gateway?.rails)
    ? gateway.rails.filter((r) => String(r?.value || "").trim())
    : [];
  const uploadList = Array.isArray(gateway?.uploads) ? gateway.uploads : [];
  const hasAnyRail =
    gateway &&
    (railList.length > 0 ||
      gateway.accountNumber ||
      gateway.usdtTrc20Address ||
      gateway.usdtErc20Address ||
      uploadList.length > 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || !parseFloat(amount)) return;
    setSubmitting(true);
    try {
      const res = await WalletAPI.depositRequest({
        symbol,
        amount: parseFloat(amount),
        network: "MANUAL",
        txHash: txHash || null,
      });
      toast?.(
        "success",
        res.message ||
          "Deposit request sent. Attach your receipt screenshot in Live Chat."
      );
      setAmount("");
      setTxHash("");
      onOpenLiveChat?.();
    } catch (err) {
      toast?.("error", err?.message || "Deposit failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1424] p-5">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-tight text-white">
        <ArrowDownToLine className="h-4 w-4 text-emerald-300" /> Deposit Funds
      </h3>
      <p className="mb-4 text-[12px] text-slate-500">
        Use the merchant deposit rails configured by your administrator (global bank / USDT).
        Local EasyPaisa / JazzCash rails are not used.
      </p>

      {gwLoading && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs text-slate-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading merchant deposit details…
        </div>
      )}

      {!gwLoading && !hasAnyRail && (
        <div className="mb-3 rounded-xl border border-amber-400/25 bg-amber-500/10 p-3 text-xs text-amber-200">
          Merchant deposit rails are not configured yet. Ask support to publish deposit
          details in Admin → Gateway.
        </div>
      )}

      {!gwLoading && hasAnyRail && (
        <div className="mb-4 space-y-2">
          {railList.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {railList.map((r) => (
                <GatewayField
                  key={r.id || r.label}
                  label={r.label || "Detail"}
                  value={r.value}
                  onCopy={copy}
                />
              ))}
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              <GatewayField label="USDT · TRC20" value={gateway.usdtTrc20Address} onCopy={copy} />
              <GatewayField label="USDT · ERC20" value={gateway.usdtErc20Address} onCopy={copy} />
              <GatewayField label="Account Number" value={gateway.accountNumber} onCopy={copy} />
              <GatewayField label="Bank" value={gateway.bankName} onCopy={copy} />
            </div>
          )}

          {uploadList.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {uploadList.map((u) => (
                <div key={u.id} className="rounded-xl border border-white/5 bg-white/[0.03] p-2">
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-emerald-300">
                    {u.fileName || "Attachment"}
                  </div>
                  {String(u.mimeType || "").startsWith("image/") && u.dataUrl ? (
                    <a href={u.dataUrl} target="_blank" rel="noreferrer">
                      <img
                        src={u.dataUrl}
                        alt={u.fileName || "upload"}
                        className="max-h-40 w-full rounded-lg object-contain"
                      />
                    </a>
                  ) : u.dataUrl ? (
                    <a
                      href={u.dataUrl}
                      download={u.fileName || "file"}
                      className="text-xs text-cyan-300 underline"
                    >
                      Download {u.fileName || "file"}
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          )}

          {gateway.instructions && (
            <div className="whitespace-pre-wrap rounded-xl border border-white/5 bg-white/[0.02] p-3 text-[11px] text-slate-300">
              {gateway.instructions}
            </div>
          )}
        </div>
      )}

      <div className="mb-4 flex flex-col gap-2 rounded-xl border border-teal-400/25 bg-teal-500/10 p-3 text-[11px] text-teal-100 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          <MessageCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-300" />
          <span>
            Transfer funds, submit the request below, then send your receipt screenshot in Live Chat.
          </span>
        </div>
        <button
          type="button"
          onClick={() => onOpenLiveChat?.()}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-teal-400 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-teal-950"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          Open Live Chat
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Credit To
            </label>
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full appearance-none rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-sm text-slate-100 outline-none"
            >
              {["USDT", "BTC", "ETH", "SOL"].map((s) => (
                <option key={s} value={s} className="bg-slate-900">
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Amount deposited
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
        </div>

        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Reference / Tx Hash (optional)
          </label>
          <input
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
            placeholder="Transfer reference or blockchain hash"
            className="w-full rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 font-mono text-sm text-slate-100 outline-none placeholder:text-slate-600"
          />
        </div>

        <motion.button
          type="submit"
          disabled={submitting || !parseFloat(amount)}
          whileHover={!submitting ? { scale: 1.01 } : undefined}
          whileTap={!submitting ? { scale: 0.99 } : undefined}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
            </>
          ) : (
            <>
              <Send className="h-4 w-4" /> Submit Deposit Request
            </>
          )}
        </motion.button>
      </form>
    </div>
  );
}
