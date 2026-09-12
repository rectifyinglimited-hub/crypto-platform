import { useMemo, useState } from "react";
import { Globe2, Newspaper, TrendingUp, X } from "lucide-react";
import { useDeskBrand } from "../lib/deskBrand.js";

const ICONS = [Globe2, TrendingUp, Newspaper];

export default function MarketInsightsNews() {
  const { deskNews } = useDeskBrand();
  const items = Array.isArray(deskNews) && deskNews.length ? deskNews : [];
  const loop = useMemo(() => (items.length ? [...items, ...items] : []), [items]);
  const [openId, setOpenId] = useState(null);
  const [listOpen, setListOpen] = useState(false);
  const selected = items.find((n) => n.id === openId) || null;
  const seconds = Math.max(18, items.length * 6);

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-white/10 bg-[#0d1424] px-3 py-3 md:px-4 md:py-4">
      <style>{`
        @keyframes equiti-news-rise {
          0% { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        .equiti-news-rise {
          animation: equiti-news-rise var(--news-s, 24s) linear infinite;
        }
        .equiti-news-rise:hover {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .equiti-news-rise { animation: none; }
        }
      `}</style>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400/80">
        Market Insights & News
      </div>
      <div className="relative mt-2 h-[104px] overflow-hidden md:h-[148px] lg:h-[200px]">
        {items.length ? (
          <div
            className="equiti-news-rise absolute inset-x-0 top-0"
            style={{ "--news-s": `${seconds}s` }}
          >
            {loop.map((item, i) => {
              const Icon = ICONS[i % ICONS.length];
              return (
                <button
                  key={`${item.id}-${i}`}
                  type="button"
                  onClick={() => setOpenId(item.id)}
                  className="flex w-full items-center gap-2.5 py-2 text-left"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-cyan-300">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-semibold leading-tight text-white">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block truncate text-[10px] text-slate-500">
                      {item.source || "Desk"}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-[11px] text-slate-500">No desk notes yet.</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => setListOpen(true)}
        className="mt-auto pt-1 text-left text-[11px] font-semibold text-cyan-300"
      >
        View all news
      </button>

      {listOpen || selected ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4">
          <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#0d1424] p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400/80">
                  Market Insights & News
                </div>
                <h3 className="mt-1 text-lg font-bold text-white">
                  {selected ? selected.title : "All desk notes"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpenId(null);
                  setListOpen(false);
                }}
                className="rounded-lg p-1 text-slate-400 hover:text-white"
                aria-label="Close news"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {selected ? (
              <div>
                <p className="text-[11px] text-slate-500">{selected.source}</p>
                <p className="mt-3 text-sm leading-relaxed text-slate-200">
                  {selected.body || selected.summary}
                </p>
                <button
                  type="button"
                  onClick={() => setOpenId(null)}
                  className="mt-4 text-[11px] font-semibold text-cyan-300"
                >
                  Back to list
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setOpenId(item.id)}
                    className="block w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-left hover:bg-white/[0.06]"
                  >
                    <div className="text-sm font-semibold text-white">{item.title}</div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      {item.source}
                      {item.summary ? ` · ${item.summary}` : ""}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
