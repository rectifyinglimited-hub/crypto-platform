/**
 * Public 9-digit account UID.
 * Prefer the value saved by the API; if an older session has none yet,
 * derive the same number the backend will persist from the account id.
 */
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

export function publicUid(user) {
  const raw = Number(user?.uid);
  if (Number.isFinite(raw) && raw >= 10000000 && raw <= 999999999) return raw;
  return uidFromAccountId(user?.id || user?._id);
}
