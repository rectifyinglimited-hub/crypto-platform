/**
 * =============================================================================
 *  NEXUS BACKEND — models/StakingPosition.js
 * =============================================================================
 *  Locked-yield position for the Nexus Quant Bot engine.
 *    • principal   — amount debited from the user's spot wallet.
 *    • symbol      — asset locked (typically USDT for MVP).
 *    • yieldPct    — payout at maturity, e.g. 5 (5%).
 *    • days        — lock duration.
 *    • endsAt      — pre-computed = startedAt + days.
 *    • status      — active | completed | canceled.
 *    • payout      — set on completion = principal * (1 + yield/100).
 * =============================================================================
 */

import mongoose from "mongoose";

const { Schema } = mongoose;

const StakingPositionSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tier: {
      type: String,
      enum: ["micro", "alpha", "quantum"],
      required: true,
    },
    tierLabel: { type: String, default: null },
    principal: { type: Number, required: true, min: 0 },
    symbol: { type: String, uppercase: true, default: "USDT" },
    yieldPct: { type: Number, required: true, min: 0 },
    days: { type: Number, required: true, min: 1 },
    startedAt: { type: Date, default: () => new Date() },
    endsAt: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ["active", "completed", "canceled"],
      default: "active",
      index: true,
    },
    payout: { type: Number, default: 0 },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const StakingPosition =
  mongoose.models.StakingPosition ||
  mongoose.model("StakingPosition", StakingPositionSchema);
export default StakingPosition;
