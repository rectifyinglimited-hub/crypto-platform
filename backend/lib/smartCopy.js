export const SMART_COPY_SLOTS = [
  {
    slot: 0,
    defaultAsset: "BTC",
    defaultType: "crypto",
    accuracy: 94,
    prediction: "Bullish Breakout",
    followers: 12450,
    bar: "green",
  },
  {
    slot: 1,
    defaultAsset: "XAUUSD",
    defaultType: "forex",
    accuracy: 88,
    prediction: "Support Retest",
    followers: 9120,
    bar: "cyan",
  },
  {
    slot: 2,
    defaultAsset: "EURUSD",
    defaultType: "forex",
    accuracy: 70,
    prediction: "Ranging Market",
    followers: 3500,
    bar: "orange",
  },
  {
    slot: 3,
    defaultAsset: "AAPL",
    defaultType: "stock",
    accuracy: 62,
    prediction: "Volatile Dip",
    followers: 1800,
    bar: "red",
  },
];

export function isSlotOpen(slotDoc, now = new Date()) {
  if (!slotDoc || slotDoc.enabled === false) return false;
  if (slotDoc.readyAt && new Date(slotDoc.readyAt).getTime() > now.getTime()) {
    return false;
  }
  return true;
}

export function normalizeSmartCopy(user) {
  const max = Math.min(4, Math.max(1, Number(user.smartCopyMaxSlots || 1)));
  user.smartCopyMaxSlots = max;
  const prev = Array.isArray(user.smartCopySlots) ? user.smartCopySlots : [];
  user.smartCopySlots = [0, 1, 2, 3].map((slot) => {
    const found = prev.find((s) => Number(s.slot) === slot);
    return {
      slot,
      enabled: found ? found.enabled !== false : false,
      readyAt: found?.readyAt || null,
    };
  });
  return user;
}

export function serializeSmartCopy(user, copies = []) {
  normalizeSmartCopy(user);
  const now = new Date();
  const copiedSlots = new Set(
    copies.map((c) => Number(c.slot)).filter((n) => n >= 0)
  );
  return {
    maxSlots: Number(user.smartCopyMaxSlots || 1),
    copiedCount: copiedSlots.size,
    slots: user.smartCopySlots.map((s) => {
      const meta = SMART_COPY_SLOTS[s.slot] || SMART_COPY_SLOTS[0];
      const copied = copiedSlots.has(s.slot);
      const open = isSlotOpen(s, now);
      return {
        slot: s.slot,
        enabled: s.enabled !== false,
        readyAt: s.readyAt || null,
        isOpen: open,
        copied,
        accuracy: meta.accuracy,
        prediction: meta.prediction,
        followers: meta.followers,
        bar: meta.bar,
        defaultAsset: meta.defaultAsset,
        defaultType: meta.defaultType,
      };
    }),
  };
}
