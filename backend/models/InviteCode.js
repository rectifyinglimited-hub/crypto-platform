/**
 * =============================================================================
 *  NEXUS BACKEND — models/InviteCode.js
 * =============================================================================
 *  Invite-code registry used by the Admin Panel.
 *    • `code`        unique short string (uppercase).
 *    • `role`        role granted to accounts that redeem this code.
 *    • `maxUses`     hard cap on redemptions.
 *    • `usedBy`      audit trail of which users consumed the code.
 *    • `active`      soft flag to disable without deleting.
 *    • `expiresAt`   optional expiry.
 *  Virtual `status` computes: active | disabled | expired | used.
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
      enum: ["user", "admin"],
      default: "user",
    },
    maxUses: {
      type: Number,
      default: 1,
      min: 1,
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
  if (!this.active) return "disabled";
  if (this.expiresAt && this.expiresAt < new Date()) return "expired";
  if ((this.usedBy?.length || 0) >= this.maxUses) return "exhausted";
  return "active";
});

const InviteCode =
  mongoose.models.InviteCode || mongoose.model("InviteCode", InviteCodeSchema);

export default InviteCode;
