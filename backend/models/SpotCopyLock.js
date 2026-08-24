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
      required: true,
      index: true,
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    principal: { type: Number, required: true, min: 0 },
    lockDays: { type: Number, required: true, min: 1 },
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
