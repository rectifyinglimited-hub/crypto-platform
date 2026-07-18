/**
 * =============================================================================
 *  NEXUS BACKEND — models/InviteCode.js
 * =============================================================================
 *  Invite-code registry used by the Admin Panel.
 *    • `code`        unique short string (uppercase).
 *    • `role`        role granted to accounts that redeem this code.
 *    • `maxUses`     always 1 (single-use policy).
 *    • `usedBy`      audit trail of which user consumed the code.
 *    • `active`      soft flag; set false after successful redeem.
 *    • `expiresAt`   optional expiry.
 *  Virtual `status` computes: active | disabled | expired | exhausted.
 * =============================================================================
 */

import mongoose from "mongoose";

const { Schema } = mongoose;

const InviteCodeSchema = new Schema(
  {
    code: {
      type: String,
      required: [true, "Code is required."],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: 4,
      maxlength: 32,
    },
    role: {
      type: String,
      // Codes may only mint USER or ADMIN — never SUPER_ADMIN via invite.
      enum: ["user", "admin"],
      default: "user",
    },
    maxUses: {
      type: Number,
      default: 1,
      min: 1,
      max: 1, // platform policy: one registration per code
    },
    usedBy: [
      {
        user: { type: Schema.Types.ObjectId, ref: "User" },
        at: { type: Date, default: Date.now },
      },
    ],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    /** Tenant owner — stamped onto redeeming users as their adminId */
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtuals
InviteCodeSchema.virtual("uses").get(function () {
  return this.usedBy?.length || 0;
});

InviteCodeSchema.virtual("status").get(function () {
  if (!this.active) {
    return (this.usedBy?.length || 0) >= 1 ? "exhausted" : "disabled";
  }
  if (this.expiresAt && this.expiresAt < new Date()) return "expired";
  if ((this.usedBy?.length || 0) >= 1) return "exhausted";
  return "active";
});

const InviteCode =
  mongoose.models.InviteCode || mongoose.model("InviteCode", InviteCodeSchema);

export default InviteCode;
