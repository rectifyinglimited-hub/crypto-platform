/**
 * Catalog of AI copy strategies — Spot Copy vs Future AI (display / follow).
 */
import mongoose from "mongoose";

const { Schema } = mongoose;

const CopyBotSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    tradeType: {
      type: String,
      enum: ["spot_copy", "future_ai"],
      required: true,
      index: true,
    },
    isTesting: { type: Boolean, default: false },
    enabled: { type: Boolean, default: true, index: true },
    assetType: {
      type: String,
      required: true,
      trim: true,
      default: "BTC/USDT",
    },
    predictionConfidence: { type: Number, min: 0, max: 100, default: 70 },
    accuracyHistorical: { type: String, default: "70%" },
    totalFollowers: { type: Number, min: 0, default: 0 },
    topSignalDirection: {
      type: String,
      enum: ["Bullish", "Bearish", "Neutral"],
      default: "Bullish",
    },
    summary: { type: String, default: "" },
    lockDays: { type: Number, min: 1, max: 3650, default: 30 },
    yieldPct: { type: Number, min: 0, max: 500, default: 8 },
    minPrincipal: { type: Number, min: 1, default: 50 },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

CopyBotSchema.index({ tradeType: 1, enabled: 1 });

export default mongoose.models.CopyBot || mongoose.model("CopyBot", CopyBotSchema);
