/**
 * Local notification inbox (Facebook-style bell).
 * Scoped per user id in localStorage.
 */

const MAX_ITEMS = 60;
const PREFIX = "nexus_notifications_v1_";

function storageKey(userId) {
  return `${PREFIX}${String(userId || "anon")}`;
}

function safeParse(raw) {
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function loadNotifications(userId) {
  if (!userId) return [];
  try {
    return safeParse(localStorage.getItem(storageKey(userId)));
  } catch {
    return [];
  }
}

export function saveNotifications(userId, list) {
  if (!userId) return;
  try {
    localStorage.setItem(
      storageKey(userId),
      JSON.stringify((list || []).slice(0, MAX_ITEMS))
    );
  } catch {
    /* quota / private mode */
  }
}

export function unreadCount(list) {
  return (list || []).filter((n) => n && !n.read).length;
}

export function pushNotification(userId, entry) {
  if (!userId || !entry) return loadNotifications(userId);
  const id =
    entry.id ||
    `${entry.type || "note"}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
  const item = {
    id,
    type: entry.type || "info",
    title: entry.title || "Notification",
    body: entry.body || "",
    createdAt: entry.createdAt || new Date().toISOString(),
    read: false,
    meta: entry.meta || {},
  };
  const prev = loadNotifications(userId);
  // Dedupe by id (e.g. same trade settle / chat message)
  if (prev.some((n) => n.id === id)) return prev;
  const next = [item, ...prev].slice(0, MAX_ITEMS);
  saveNotifications(userId, next);
  return next;
}

export function markAllRead(userId) {
  const next = loadNotifications(userId).map((n) => ({ ...n, read: true }));
  saveNotifications(userId, next);
  return next;
}

export function markRead(userId, id) {
  const next = loadNotifications(userId).map((n) =>
    n.id === id ? { ...n, read: true } : n
  );
  saveNotifications(userId, next);
  return next;
}

export function clearNotifications(userId) {
  saveNotifications(userId, []);
  return [];
}

export function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(iso).toLocaleDateString();
}
