/**
 * Single Trading Wallet (USDT) ledger — every credit/debit writes history.
 */
import Transaction from "../models/Transaction.js";

export async function recordLedger({
  user,
  delta,
  source,
  note,
  kind = "trade",
  symbol = "USDT",
  extra = {},
}) {
  const n = Number(delta) || 0;
  await Transaction.create({
    user: user._id,
    adminId: user.adminId || extra.adminId || null,
    kind,
    side: n >= 0 ? "buy" : "sell",
    symbol,
    amount: Math.abs(n),
    usdValue: Math.abs(n),
    ledgerDelta: n,
    source: source || null,
    status: extra.status || "completed",
    reviewerNote: note || "",
    ...Object.fromEntries(
      Object.entries(extra).filter(
        ([k]) => !["adminId", "status"].includes(k)
      )
    ),
  });
}

export async function applyUsdtDelta(user, delta, meta = {}) {
  if (!(user.wallet instanceof Map)) user.wallet = new Map();
  const usdt = Number(user.wallet.get("USDT") || 0);
  const next = Number((usdt + Number(delta)).toFixed(8));
  if (next < 0) {
    const err = new Error("Insufficient Trading Wallet balance.");
    err.status = 422;
    throw err;
  }
  user.wallet.set("USDT", next);
  user.markModified("wallet");
  await user.save();
  await recordLedger({ user, delta: Number(delta), ...meta });
  return next;
}

export function walletObj(w) {
  if (w instanceof Map) return Object.fromEntries(w);
  return { ...(w || {}) };
}
