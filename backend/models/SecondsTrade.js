/**
 * =============================================================================
 *  NEXUS BACKEND — models/SecondsTrade.js
 * =============================================================================
 *  Fixed-time (seconds) trading positions with admin outcome / price bias.
 * =============================================================================
 */

import mongoose from "mongoose";

const { Schema } = mongoose;

const SecondsTradeSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    /** Tenant seal — parent ADMIN for trade-order isolation */
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    asset: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    assetType: {
      type: String,
      enum: ["crypto", "stock"],
      default: "crypto",
    },
    /** long = Buy Long (profit if price rises); short = Sell Short */
    direction: {
      type: String,
      enum: ["long", "short"],
      required: true,
    },
    stake: {
      type: Number,
      required: true,
      min: 0.01,
    },
    durationSec: {
      type: Number,
      required: true,
      min: 10,
      max: 3600,
    },
    entryPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    /** Admin live chart nudge in percent (e.g. +0.4 / -0.4) */
    priceBiasPercent: {
      type: Number,
      default: 0,
    },
    payoutPercent: {
      type: Number,
      default: 85,
      min: 0,
      max: 200,
    },
    /** Manual Balance Add — USDT profit (WIN) or loss slice (LOSS) at timer = 0 */
    forcedAmount: {
      type: Number,
      default: null,
    },
    openedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["open", "settling", "won", "lost", "cancelled"],
      default: "open",
      index: true,
    },
    /** Admin per-trade override — takes precedence over user.tradeControlState */
    forcedOutcome: {
      type: String,
      enum: ["win", "loss", null],
      default: null,
    },
    exitPrice: {
      type: Number,
      default: null,
    },
    payout: {
      type: Number,
      default: 0,
    },
    /** Extra USDT deducted on forced loss (beyond stake already locked) */
    lossAmount: {
      type: Number,
      default: 0,
    },
    settledAt: {
      type: Date,
      default: null,
    },
    settleReason: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

SecondsTradeSchema.index({ user: 1, status: 1 });
SecondsTradeSchema.index({ status: 1, expiresAt: 1 });

const SecondsTrade =
  mongoose.models.SecondsTrade ||
  mongoose.model("SecondsTrade", SecondsTradeSchema);

export default SecondsTrade;
