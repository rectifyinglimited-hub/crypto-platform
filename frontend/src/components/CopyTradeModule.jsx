/**
 * Copy Trade — list + detail (admin-authored equity/history) + follow.
 */
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Copy, X } from "lucide-react";
import { PlatformAPI, assetUrl } from "../lib/api.js";

function fmtUsd(n) {
  return `$${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function MiniEquity({ series }) {
  const data =
    Array.isArray(series) && series.length ? series : [100, 102, 101, 105, 110];
  const W = 280;
  const H = 72;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * (W - 6) + 3;
      const y = H - 6 - ((v - min) / range) * (H - 12);
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-16 w-full">
      <polyline fill="none" stroke="#2dd4bf" strokeWidth="2" points={pts} />
    </svg>
  );
}

export default function CopyTradeModule({
  items,
  loading,
  PageHeader,
  Card,
  LoadingBlock,
  EmptyState,
  OrderModal,
  PRIMARY_BTN,
  onToast,
  onWalletUpdate,
}) {
  const [detail, setDetail] = useState(null);
  const [followTarget, setFollowTarget] = useState(null);

  return (
    <div>
      <PageHeader
        icon={Copy}
        title="Copy Trade"
        subtitle="Follow admin-managed desks — review history & equity before you follow"
      />
      {loading ? (
        <LoadingBlock />
      ) : items.length === 0 ? (
        <EmptyState icon={Copy} label="No traders available." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <Card key={it._id}>
              <div className="mb-3 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-cyan-500/30 to-teal-500/20 font-bold text-cyan-200">
                  {it.imageUrl ? (
                    <img
                      src={assetUrl(it.imageUrl) || it.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    it.title?.[0]
                  )}
                </div>
                <div>
                  <div className="font-semibold text-white">{it.title}</div>
                  <div className="text-[11px] text-slate-500">
                    {it.meta?.followers ?? 0} followers
                  </div>
                </div>
              </div>
              <div className="mb-2 rounded-lg border border-white/5 bg-black/20 p-2">
                <MiniEquity series={it.meta?.equityHistory} />
              </div>
              <div className="mb-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-slate-500">Win rate</div>
                  <div className="font-bold text-emerald-400">
                    {it.meta?.winRate ?? "—"}%
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Profit share</div>
                  <div className="font-bold text-white">
                    {it.meta?.profitSharePct ?? "—"}%
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDetail(it)}
                  className="flex-1 rounded-xl border border-white/10 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/5"
                >
                  View history
                </button>
                <button
                  type="button"
                  onClick={() => setFollowTarget(it)}
                  className={`${PRIMARY_BTN} flex-1 !py-2.5`}
                >
                  Follow
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AnimatePresence>
        {detail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#0c1222] p-5"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <div className="text-lg font-bold text-white">{detail.title}</div>
                  <p className="mt-1 text-xs text-slate-400">
                    {detail.meta?.bio || detail.subtitle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDetail(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-white/5"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mb-3 rounded-xl border border-white/10 bg-black/30 p-3">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Equity curve (admin data)
                </div>
                <MiniEquity series={detail.meta?.equityHistory} />
              </div>
              <div className="mb-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-white/5 p-2">
                  <div className="text-slate-500">Win</div>
                  <div className="font-bold text-emerald-400">
                    {detail.meta?.winRate}%
                  </div>
                </div>
                <div className="rounded-lg bg-white/5 p-2">
                  <div className="text-slate-500">Share</div>
                  <div className="font-bold text-white">
                    {detail.meta?.profitSharePct}%
                  </div>
                </div>
                <div className="rounded-lg bg-white/5 p-2">
                  <div className="text-slate-500">Min</div>
                  <div className="font-bold text-white">
                    {fmtUsd(detail.meta?.minCopy || 0)}
                  </div>
                </div>
              </div>
              <div className="mb-4">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Trade history
                </div>
                <div className="space-y-1.5">
                  {(detail.meta?.tradeHistory || []).map((t, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-xs"
                    >
                      <div>
                        <span className="font-semibold text-white">{t.pair}</span>
                        <span className="ml-2 uppercase text-slate-500">
                          {t.side}
                        </span>
                        {t.note && (
                          <div className="text-[10px] text-slate-500">{t.note}</div>
                        )}
                      </div>
                      <span
                        className={`font-bold tabular-nums ${
                          Number(t.pnlPct) >= 0
                            ? "text-emerald-400"
                            : "text-rose-400"
                        }`}
                      >
                        {Number(t.pnlPct) >= 0 ? "+" : ""}
                        {Number(t.pnlPct || 0).toFixed(2)}%
                      </span>
                    </div>
                  ))}
                  {!(detail.meta?.tradeHistory || []).length && (
                    <div className="py-4 text-center text-xs text-slate-500">
                      No history published yet.
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFollowTarget(detail);
                  setDetail(null);
                }}
                className={`${PRIMARY_BTN} w-full`}
              >
                Follow {detail.title}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <OrderModal
        key={followTarget?._id || "copy-modal"}
        open={!!followTarget}
        onClose={() => setFollowTarget(null)}
        title={`Follow ${followTarget?.title || ""}`}
        subtitle={`Minimum copy amount ${fmtUsd(followTarget?.meta?.minCopy || 0)}`}
        minAmount={followTarget?.meta?.minCopy}
        submitLabel="Follow trader"
        onSubmit={async (amt) => {
          if (!amt || amt <= 0) return;
          try {
            const res = await PlatformAPI.order({
              kind: "copy_trade",
              catalogId: followTarget._id,
              amount: amt,
              meta: { trader: followTarget.title },
            });
            onToast?.("success", res.message || "Now following trader.");
            onWalletUpdate?.({ wallet: res.wallet, accounts: res.accounts });
            setFollowTarget(null);
          } catch (err) {
            onToast?.("error", err?.message || "Follow failed.");
            throw err;
          }
        }}
      />
    </div>
  );
}
