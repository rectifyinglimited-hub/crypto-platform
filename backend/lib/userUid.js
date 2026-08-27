/**
 * Public numeric UID for each account (shown to the user, searchable by admin).
 * Assigned once and kept forever — including backfill for older users.
 */
import User from "../models/User.js";

function randomUid() {
  return 100000000 + Math.floor(Math.random() * 900000000);
}

function fallbackUid(id) {
  const hex = String(id || "")
    .replace(/[^a-f0-9]/gi, "")
    .slice(-8);
  const n = Number.parseInt(hex || "1", 16);
  if (!Number.isFinite(n)) return randomUid();
  return 100000000 + (n % 900000000);
}

export async function ensureUserUid(user) {
  if (!user) return null;
  const existing = Number(user.uid);
  if (Number.isFinite(existing) && existing >= 10000000) return existing;

  for (let i = 0; i < 12; i++) {
    const uid = randomUid();
    const taken = await User.findOne({ uid }).select("_id");
    if (!taken) {
      user.uid = uid;
      await user.save();
      return uid;
    }
  }

  let uid = fallbackUid(user._id);
  for (let i = 0; i < 8; i++) {
    const taken = await User.findOne({ uid }).select("_id");
    if (!taken) {
      user.uid = uid;
      await user.save();
      return uid;
    }
    uid = randomUid();
  }
  user.uid = uid;
  await user.save();
  return uid;
}
