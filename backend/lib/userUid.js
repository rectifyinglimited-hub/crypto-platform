/**
 * Public numeric UID for each account (shown to the user, searchable by admin).
 * Assigned once and kept forever — including backfill for older users.
 * The number is derived from the account id so old sessions can show it
 * even before the field is saved.
 */
import User from "../models/User.js";

export function uidFromAccountId(id) {
  const hex = String(id || "")
    .replace(/[^a-fA-F0-9]/g, "")
    .toLowerCase();
  if (hex.length < 8) return null;
  let hash = 2166136261;
  for (let i = 0; i < hex.length; i += 1) {
    hash ^= hex.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return 100000000 + ((hash >>> 0) % 900000000);
}

function randomUid() {
  return 100000000 + Math.floor(Math.random() * 900000000);
}

function isValidUid(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 10000000 && n <= 999999999;
}

export async function ensureUserUid(user) {
  if (!user) return null;
  if (isValidUid(user.uid)) return Number(user.uid);

  const id = user._id;
  let uid = uidFromAccountId(id) || randomUid();

  for (let i = 0; i < 16; i += 1) {
    const taken = await User.findOne({
      uid,
      _id: { $ne: id },
    }).select("_id");
    if (!taken) {
      await User.updateOne({ _id: id }, { $set: { uid } });
      user.uid = uid;
      return uid;
    }
    uid = randomUid();
  }

  user.uid = uid;
  await User.updateOne({ _id: id }, { $set: { uid } });
  return uid;
}

export async function backfillMissingUserUids() {
  await User.updateMany({ uid: null }, { $unset: { uid: 1 } });
  const missing = await User.find({
    $or: [{ uid: { $exists: false } }, { uid: null }],
  }).select("_id uid");
  let n = 0;
  for (const u of missing) {
    try {
      await ensureUserUid(u);
      n += 1;
    } catch (err) {
      console.warn(`[uid] backfill failed for ${u._id}: ${err?.message || err}`);
    }
  }
  if (n) console.log(`[uid] backfilled ${n} account(s).`);
  return n;
}
