import ChatSession, { CHAT_SESSION_MS } from "../models/ChatSession.js";
import User from "../models/User.js";
import { emitChatSession } from "../socket.js";

export function serializeSession(doc) {
  if (!doc) return null;
  const row = doc.toObject ? doc.toObject() : { ...doc };
  return {
    id: String(row._id || row.id || ""),
    userId: String(row.user || ""),
    adminId: row.adminId ? String(row.adminId) : null,
    status: row.status === "open" ? "open" : "ended",
    startedAt: row.startedAt || null,
    expiresAt: row.expiresAt || null,
    endedAt: row.endedAt || null,
    endedBy: row.endedBy || null,
    remainingMs: Math.max(
      0,
      new Date(row.expiresAt || 0).getTime() - Date.now()
    ),
  };
}

export async function expireOpenSession(userId) {
  const open = await ChatSession.findOne({
    user: userId,
    status: "open",
  }).sort({ startedAt: -1 });
  if (!open) return null;
  if (new Date(open.expiresAt).getTime() > Date.now()) return open;
  return endSession(open, "timeout", open.adminId);
}

export async function getLiveSession(userId) {
  return expireOpenSession(userId);
}

export async function startSession(userId, adminId = null) {
  const current = await expireOpenSession(userId);
  if (current && current.status === "open") return current;
  if (!adminId) {
    const owner = await User.findById(userId).select("adminId");
    adminId = owner?.adminId || null;
  }
  const now = new Date();
  let created;
  try {
    created = await ChatSession.create({
      user: userId,
      adminId: adminId || null,
      status: "open",
      startedAt: now,
      expiresAt: new Date(now.getTime() + CHAT_SESSION_MS),
    });
  } catch (err) {
    if (err?.code === 11000) {
      const raced = await ChatSession.findOne({
        user: userId,
        status: "open",
      }).sort({ startedAt: -1 });
      if (raced) return raced;
    }
    throw err;
  }
  emitChatSession(userId, serializeSession(created), { adminId });
  return created;
}

export async function endSession(sessionOrUserId, endedBy, adminId = null) {
  const session =
    sessionOrUserId && sessionOrUserId._id
      ? sessionOrUserId
      : await ChatSession.findOne({
          user: sessionOrUserId,
          status: "open",
        }).sort({ startedAt: -1 });
  if (!session || session.status !== "open") return session || null;

  session.status = "ended";
  session.endedAt = new Date();
  session.endedBy = endedBy;
  if (adminId && !session.adminId) session.adminId = adminId;
  await session.save();

  emitChatSession(session.user, serializeSession(session), {
    adminId: session.adminId,
  });
  return session;
}

export async function ensureOpenForSend(userId, adminId = null) {
  const open = await expireOpenSession(userId);
  if (open && open.status === "open") return open;
  return startSession(userId, adminId);
}
