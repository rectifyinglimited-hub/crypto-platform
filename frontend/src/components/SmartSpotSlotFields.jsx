const SLOT_DEFAULTS = [
  {
    slot: 0,
    title: "Bitcoin",
    defaultAsset: "BTC",
    defaultType: "crypto",
    accuracy: "94",
    prediction: "Bullish Breakout",
    followers: "12450",
    readyAt: "",
  },
  {
    slot: 1,
    title: "Gold",
    defaultAsset: "XAUUSD",
    defaultType: "forex",
    accuracy: "88",
    prediction: "Support Retest",
    followers: "9120",
    readyAt: "",
  },
  {
    slot: 2,
    title: "EUR/USD",
    defaultAsset: "EURUSD",
    defaultType: "forex",
    accuracy: "70",
    prediction: "Ranging Market",
    followers: "3500",
    readyAt: "",
  },
  {
    slot: 3,
    title: "Apple",
    defaultAsset: "AAPL",
    defaultType: "stock",
    accuracy: "62",
    prediction: "Volatile Dip",
    followers: "1800",
    readyAt: "",
  },
];

export const DEFAULT_SPOT_SLOTS = SLOT_DEFAULTS.map((s) => ({ ...s }));

export function hydrateSpotSlot(found, slot) {
  const base = SLOT_DEFAULTS[slot] || SLOT_DEFAULTS[0];
  return {
    slot,
    title: found?.title || base.title,
    defaultAsset: found?.defaultAsset || base.defaultAsset,
    defaultType: found?.defaultType || base.defaultType,
    accuracy:
      found?.accuracy != null && Number.isFinite(Number(found.accuracy))
        ? String(Math.round(Number(found.accuracy)))
        : base.accuracy,
    prediction: found?.prediction || base.prediction,
    followers:
      found?.followers != null && Number.isFinite(Number(found.followers))
        ? String(Math.round(Number(found.followers)))
        : base.followers,
    readyAt: found?.readyAt || "",
    enabled: found?.enabled !== false,
  };
}

export function serializeSpotSlot(s) {
  return {
    slot: s.slot,
    title: String(s.title || "").trim().slice(0, 80),
    defaultAsset: String(s.defaultAsset || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 16),
    defaultType: ["crypto", "forex", "stock"].includes(s.defaultType)
      ? s.defaultType
      : "crypto",
    prediction: String(s.prediction || "").trim().slice(0, 80),
    followers: Math.max(0, Math.round(Number(s.followers) || 0)),
    accuracy: Math.min(100, Math.max(0, Math.round(Number(s.accuracy) || 0))),
    readyAt: s.readyAt ? new Date(s.readyAt).toISOString() : null,
    enabled: s.enabled !== false,
  };
}

const inputClass =
  "mt-1 w-full rounded-lg border border-white/[0.08] bg-black/20 px-2 py-1.5 text-sm text-white outline-none focus:border-cyan-500/30";

export default function SmartSpotSlotFields({ slot: s, onPatch }) {
  return (
    <div className="mt-3 space-y-3">
      <label className="block">
        <span className="text-[10px] font-semibold uppercase text-slate-500">
          Card title
        </span>
        <input
          value={s.title || ""}
          onChange={(e) => onPatch("title", e.target.value)}
          placeholder="Bitcoin"
          className={inputClass}
        />
        <span className="mt-0.5 block text-[10px] text-slate-600">
          Shown as “AI Prediction: {s.title || "…"}”
        </span>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[10px] font-semibold uppercase text-slate-500">
            Pair / asset
          </span>
          <input
            value={s.defaultAsset || ""}
            onChange={(e) => onPatch("defaultAsset", e.target.value.toUpperCase())}
            placeholder="BTC"
            className={`${inputClass} font-mono`}
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-semibold uppercase text-slate-500">
            Market
          </span>
          <select
            value={s.defaultType || "crypto"}
            onChange={(e) => onPatch("defaultType", e.target.value)}
            className={inputClass}
          >
            <option value="crypto" className="bg-slate-900">
              Crypto
            </option>
            <option value="forex" className="bg-slate-900">
              Forex
            </option>
            <option value="stock" className="bg-slate-900">
              Stock
            </option>
          </select>
        </label>
      </div>
      <div>
        <span className="text-[10px] font-semibold uppercase text-slate-500">
          Accuracy
        </span>
        <div className="mt-1 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() =>
              onPatch("accuracy", String(Math.max(0, Number(s.accuracy || 0) - 1)))
            }
            className="rounded-lg border border-white/10 px-2.5 py-1 text-xs font-bold text-slate-300 hover:bg-white/5"
          >
            −
          </button>
          <input
            type="number"
            min={0}
            max={100}
            value={s.accuracy}
            onChange={(e) => onPatch("accuracy", e.target.value)}
            className="w-16 rounded-lg border border-white/[0.08] bg-black/20 px-2 py-1 text-center font-mono text-sm text-white outline-none focus:border-cyan-500/30"
          />
          <button
            type="button"
            onClick={() =>
              onPatch(
                "accuracy",
                String(Math.min(100, Number(s.accuracy || 0) + 1))
              )
            }
            className="rounded-lg border border-white/10 px-2.5 py-1 text-xs font-bold text-slate-300 hover:bg-white/5"
          >
            +
          </button>
          <span className="text-[11px] text-slate-500">%</span>
        </div>
      </div>
      <label className="block">
        <span className="text-[10px] font-semibold uppercase text-slate-500">
          Prediction
        </span>
        <input
          value={s.prediction || ""}
          onChange={(e) => onPatch("prediction", e.target.value)}
          placeholder="Bullish Breakout"
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="text-[10px] font-semibold uppercase text-slate-500">
          Followers
        </span>
        <input
          type="number"
          min={0}
          value={s.followers || ""}
          onChange={(e) => onPatch("followers", e.target.value)}
          className={`${inputClass} font-mono`}
        />
      </label>
      <label className="block">
        <span className="text-[10px] font-semibold uppercase text-slate-500">
          Opens at
        </span>
        <div className="mt-1 flex gap-1.5">
          <input
            type="datetime-local"
            value={s.readyAt}
            onChange={(e) => onPatch("readyAt", e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-white/[0.08] bg-black/20 px-2 py-1.5 font-mono text-[11px] text-white outline-none focus:border-cyan-500/30"
          />
          <button
            type="button"
            onClick={() => onPatch("readyAt", "")}
            className="rounded-lg border border-white/10 px-2 py-1.5 text-[11px] text-slate-300"
          >
            Now
          </button>
        </div>
      </label>
    </div>
  );
}
