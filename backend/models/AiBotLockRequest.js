/**
 * User-submitted AI Futures lock. Admin must approve (and may change days).
 */
import mongoose from "mongoose";

const { Schema } = mongoose;

const AiBotLockRequestSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    requestedDays: { type: Number, required: true, min: 1, max: 3650 },
    approvedDays: { type: Number, default: null, min: 1, max: 3650 },
    principal: { type: Number, required: true, min: 0 },
    yieldPct: { type: Number, default: 8, min: 0, max: 500 },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
      index: true,
    },
    contractVersion: { type: String, default: "v1.0" },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
    reviewNote: { type: String, default: null },
  },
  { timestamps: true }
);

AiBotLockRequestSchema.index(
  { user: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "pending" },
    name: "one_pending_ai_lock_per_user",
  }
);
AiBotLockRequestSchema.index({ adminId: 1, status: 1, createdAt: -1 });

export function serializeAiBotLockRequest(doc) {
  if (!doc) return null;
  const row = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  const user = row.user && typeof row.user === "object" ? row.user : null;
  return {
    id: String(row._id),
    userId: String(user?._id || row.user),
    user: user
      ? {
          id: String(user._id),
          username: user.username || null,
          email: user.email || null,
          fullName: user.fullName || null,
        }
      : null,
    requestedDays: Number(row.requestedDays || 0),
    approvedDays: row.approvedDays != null ? Number(row.approvedDays) : null,
    principal: Number(row.principal || 0),
    yieldPct: Number(row.yieldPct || 0),
    status: row.status,
    createdAt: row.createdAt,
    reviewedAt: row.reviewedAt || null,
    reviewNote: row.reviewNote || null,
  };
}

export default mongoose.model("AiBotLockRequest", AiBotLockRequestSchema);
