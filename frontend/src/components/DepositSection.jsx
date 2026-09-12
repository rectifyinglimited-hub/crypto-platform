/**
 * Professional deposit desk — network, official address, proof, review status.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownToLine,
  Check,
  Copy,
  ImageIcon,
  Loader2,
  MessageCircle,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { GatewayAPI, WalletAPI } from "../lib/api.js";
import {
  MIN_USDT_DEPOSIT,
  parseDepositNetworks,
  qrImageUrl,
  txStatusLabel,
  txStatusTone,
} from "../lib/depositRails.js";

function fmtUsd(n) {
  return Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtWhen(d) {
  if (!d) return "";
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return "";
  return t.toLocaleString();
}

export default function DepositSection({ toast, onOpenLiveChat, onSubmitted }) {
  const [gateway, setGateway] = useState(null);
  const [gwLoading, setGwLoading] = useState(true);
  const [networkId, setNetworkId] = useState("");
  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState("");
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [recent, setRecent] = useState([]);
  const fileRef = useRef(null);

  const networks = useMemo(() => parseDepositNetworks(gateway), [gateway]);
  const selected =
    networks.find((n) => n.id === networkId) || networks[0] || null;

  const loadRecent = async () => {
    try {
      const res = await WalletAPI.transactions({ kind: "deposit" });
      setRecent((res.transactions || []).slice(0, 8));
    } catch {
      setRecent([]);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setGwLoading(true);
    GatewayAPI.current()
      .then((r) => {
        if (cancelled) return;
        setGateway(r.settings || {});
      })
      .catch(() => {
        if (!cancelled) setGateway({});
      })
      .finally(() => {
        if (!cancelled) setGwLoading(false);
      });
    loadRecent();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selected) return;
    if (!networks.some((n) => n.id === networkId)) {
      setNetworkId(selected.id);
    }
  }, [networks, networkId, selected]);

  const copyAddress = async (value, label = "Address") => {
    const v = String(value || "").trim();
    if (!v) return;
    try {
      await navigator.clipboard.writeText(v);
      setCopied(true);
      toast?.("success", `${label} copied.`);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast?.("error", "Could not copy — select the value manually.");
    }
  };

  const onPickProof = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type?.startsWith("image/")) {
      toast?.("error", "Upload a screenshot image (JPG or PNG).");
      return;
    }
    if (f.size > 6 * 1024 * 1024) {
      toast?.("error", "Screenshot is too large — keep under 6 MB.");
      return;
    }
    setProofFile(f);
    setProofPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amt = Number(amount);
    if (submitting) return;
    if (!Number.isFinite(amt) || amt <= 0) {
      toast?.("error", "Enter the amount you already sent.");
      return;
    }
    if (amt < MIN_USDT_DEPOSIT) {
      toast?.("error", `Minimum deposit is $${MIN_USDT_DEPOSIT}.`);
      return;
    }
    if (!proofFile) {
      toast?.("error", "Attach a clear payment screenshot.");
      return;
    }
    if (!selected) {
      toast?.("error", "Deposit rails are not published yet.");
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("amount", String(amt));
      fd.append("symbol", "USDT");
      fd.append("network", selected.id);
      if (txHash.trim()) fd.append("txHash", txHash.trim());
      fd.append("proof", proofFile);
      const res = await WalletAPI.depositProof(fd);
      toast?.(
        "success",
        res.message || "Deposit submitted — pending desk review."
      );
      setAmount("");
      setTxHash("");
      setProofFile(null);
      setProofPreview(null);
      onSubmitted?.(res.transaction);
      await loadRecent();
    } catch (err) {
      toast?.("error", err?.message || "Deposit failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const uploads = Array.isArray(gateway?.uploads) ? gateway.uploads : [];
  const qr =
    selected?.kind === "crypto"
      ? gateway?.depositQrImage || qrImageUrl(selected.address)
      : "";

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="rounded-2xl border border-white/10 bg-[#0d1424] p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-lg font-semibold text-white">
              <ArrowDownToLine className="h-5 w-5 text-emerald-300" />
              Deposit
            </h1>
            <p className="mt-1 text-[13px] text-slate-400">
              Send USDT to the official desk address, then submit your receipt.
              Balance credits after desk verification.
            </p>
          </div>
          <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-200">
            USDT
          </span>
        </div>

        {gwLoading && (
          <div className="mt-5 flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading deposit rails…
          </div>
        )}

        {!gwLoading && networks.length === 0 && (
          <div className="mt-5 rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-3 text-sm text-amber-100">
            Official deposit details are not published yet. Open Live Chat and a
            manager will send the correct rail.
          </div>
        )}

        {!gwLoading && networks.length > 0 && (
          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            <section>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                1 · Choose network
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {networks.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => setNetworkId(n.id)}
                    className={`rounded-xl border px-3 py-2.5 text-left ${
                      selected?.id === n.id
                        ? "border-emerald-400/40 bg-emerald-500/15"
                        : "border-white/10 bg-white/[0.03] hover:border-white/20"
                    }`}
                  >
                    <div className="text-sm font-semibold text-white">{n.label}</div>
                    <div className="mt-0.5 text-[10px] text-slate-500">{n.subtitle}</div>
                  </button>
                ))}
              </div>
            </section>

            <section>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                2 · Send to this destination
              </div>
              {selected?.kind === "crypto" ? (
                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    {qr ? (
                      <div className="mx-auto shrink-0 rounded-xl bg-white p-2 sm:mx-0">
                        <img
                          src={qr}
                          alt="Deposit QR"
                          className="h-36 w-36"
                        />
                      </div>
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300/80">
                        Official {selected.label} address
                      </div>
                      <code className="mt-1.5 block break-all font-mono text-[13px] leading-relaxed text-white">
                        {selected.address}
                      </code>
                      <button
                        type="button"
                        onClick={() => copyAddress(selected.address, selected.label)}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-400 px-3 py-1.5 text-xs font-bold text-emerald-950"
                      >
                        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {copied ? "Copied" : "Copy address"}
                      </button>
                      <p className="mt-3 text-[11px] leading-relaxed text-amber-200/90">
                        {selected.warning} Minimum ${MIN_USDT_DEPOSIT} USDT.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 rounded-2xl border border-white/10 bg-black/25 p-4">
                  {(selected?.rails || []).map((r) => (
                    <div
                      key={r.id || r.label}
                      className="flex items-start justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300/80">
                          {r.label}
                        </div>
                        <div className="mt-0.5 break-all font-mono text-sm text-white">
                          {r.value}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyAddress(r.value, r.label)}
                        className="shrink-0 rounded-lg border border-white/10 p-1.5 text-slate-400 hover:text-white"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <p className="text-[11px] text-amber-200/90">{selected?.warning}</p>
                </div>
              )}

              {uploads.length > 0 && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {uploads.map((u) => (
                    <div key={u.id} className="rounded-xl border border-white/8 bg-white/[0.03] p-2">
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        {u.fileName || "Desk file"}
                      </div>
                      {String(u.mimeType || "").startsWith("image/") && u.dataUrl ? (
                        <a href={u.dataUrl} target="_blank" rel="noreferrer">
                          <img
                            src={u.dataUrl}
                            alt={u.fileName || "upload"}
                            className="max-h-36 w-full rounded-lg object-contain"
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

              {gateway?.instructions ? (
                <p className="mt-3 whitespace-pre-wrap rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-[12px] text-slate-300">
                  {gateway.instructions}
                </p>
              ) : null}
            </section>

            <section>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                3 · Confirm transfer
              </div>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Amount sent (USDT)
                  </label>
                  <input
                    type="number"
                    min={MIN_USDT_DEPOSIT}
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={`${MIN_USDT_DEPOSIT}.00`}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-emerald-400/40"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Transaction hash / reference (optional)
                  </label>
                  <input
                    value={txHash}
                    onChange={(e) => setTxHash(e.target.value)}
                    placeholder="Paste TxID or bank reference"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 font-mono text-sm text-white outline-none placeholder:text-slate-600 focus:border-emerald-400/40"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Payment screenshot
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
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.03] py-4 text-sm text-slate-300 hover:border-emerald-400/40"
                  >
                    <Upload className="h-4 w-4" />
                    {proofFile ? proofFile.name : "Upload receipt screenshot"}
                  </button>
                  {proofPreview ? (
                    <img
                      src={proofPreview}
                      alt="Receipt preview"
                      className="mt-2 max-h-44 w-full rounded-xl object-contain ring-1 ring-white/10"
                    />
                  ) : null}
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
                    </>
                  ) : (
                    <>
                      <ImageIcon className="h-4 w-4" /> Submit for review
                    </>
                  )}
                </button>
                <p className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-500">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
                  Funds stay pending until the desk verifies the receipt. Nothing
                  is deducted from your wallet for a deposit.
                </p>
              </div>
            </section>
          </form>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0d1424] p-5">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Recent deposits
        </div>
        {recent.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No deposit requests yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-white/5">
            {recent.map((tx) => (
              <li key={tx._id || tx.id} className="flex items-center justify-between gap-3 py-2.5">
                <div>
                  <div className="text-sm font-semibold tabular-nums text-white">
                    ${fmtUsd(tx.amount)} {tx.symbol || "USDT"}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {tx.network || "—"} · {fmtWhen(tx.createdAt)}
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${txStatusTone(tx.status)}`}>
                  {txStatusLabel(tx.status)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={() => onOpenLiveChat?.()}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[#0d1424] px-4 py-3 text-sm text-slate-300 hover:border-cyan-400/30 hover:text-white"
      >
        <MessageCircle className="h-4 w-4 text-cyan-300" />
        Need help? Open Live Chat
      </button>
    </div>
  );
}
