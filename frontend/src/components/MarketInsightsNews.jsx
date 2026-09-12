import { useMemo, useState } from "react";
import { Newspaper, X } from "lucide-react";
import { useDeskBrand } from "../lib/deskBrand.js";

export default function MarketInsightsNews() {
  const { deskNews } = useDeskBrand();
  const items = Array.isArray(deskNews) && deskNews.length ? deskNews : [];
  const loop = useMemo(() => [...items, ...items], [items]);
  const [openId, setOpenId] = useState(null);
  const [listOpen, setListOpen] = useState(false);
  const selected = items.find((n) => n.id === openId) || null;

  return (
    <div className="flex h-full min-h-[168px] flex-col rounded-2xl border border-white/10 bg-[#0d1424] px-4 py-4">
      <style>{`
        @keyframes equiti-news-rise {
          0% { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        .equiti-news-rise {
          animation: equiti-news-rise 26s linear infinite;
        }
        .equiti-news-rise:hover {
          animation-play-state: paused;
        }
      `}</style>
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-cyan-400/80">
        <Newspaper className="h-3.5 w-3.5" />
        Market Insights & News
      </div>
      <div className="relative mt-3 min-h-[96px] flex-1 overflow-hidden">
        {items.length ? (
          <div className="equiti-news-rise space-y-2">
            {loop.map((item, i) => (
              <button
                key={`${item.id}-${i}`}
                type="button"
                onClick={() => setOpenId(item.id)}
                className="block w-full rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-left hover:bg-white/[0.06]"
              >
                <div className="flex items-center gap-2">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-cyan-500/15 text-[10px] text-cyan-200">
                    ●
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[12px] font-semibold text-white">
                      {item.title}
                    </div>
                    <div className="truncate text-[10px] text-slate-500">
                      {item.source}
                      {item.summary ? ` · ${item.summary}` : ""}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500">No desk notes yet.</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => setListOpen(true)}
        className="mt-3 text-left text-[11px] font-semibold text-cyan-300 hover:text-cyan-200"
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
