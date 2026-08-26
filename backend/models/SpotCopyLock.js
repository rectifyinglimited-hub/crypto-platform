/**
 * User lock following an AI Spot Copy bot strategy.
 */
import mongoose from "mongoose";

const { Schema } = mongoose;

const SpotCopyLockSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    bot: {
      type: Schema.Types.ObjectId,
      ref: "CopyBot",
      default: null,
      index: true,
    },
    slot: { type: Number, min: 0, max: 3, default: 0, index: true },
    selectedAsset: { type: String, default: "" },
    selectedAssetType: { type: String, default: "crypto" },
    selectedPair: { type: String, default: "" },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    principal: { type: Number, default: 0, min: 0 },
    lockDays: { type: Number, default: 30, min: 1 },
    yieldPct: { type: Number, default: 8, min: 0, max: 500 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["active", "completed", "cancelled", "claimed"],
      default: "active",
      index: true,
    },
    assetType: { type: String, default: "" },
    signalAtFollow: { type: String, default: "" },
    confidenceAtFollow: { type: Number, default: null },
  },
  { timestamps: true }
);

SpotCopyLockSchema.index({ user: 1, status: 1 });

export default mongoose.models.SpotCopyLock ||
  mongoose.model("SpotCopyLock", SpotCopyLockSchema);
