/**
 * AI Bot trading contracts — lock period + legal acceptance + custom yield.
 */
import mongoose from "mongoose";

const { Schema } = mongoose;

const AiBotContractSchema = new Schema(
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
    lockDays: { type: Number, required: true, min: 1 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    principal: { type: Number, required: true, min: 0 },
    /** Daily commission % of principal (admin may update while active). */
    customPercentage: { type: Number, default: 5, min: 0, max: 500 },
    status: {
      type: String,
      enum: ["active", "completed", "cancelled", "claimed"],
      default: "active",
      index: true,
    },
    contractAcceptedAt: { type: Date, required: true },
    contractVersion: { type: String, default: "v1.0" },
    claimedAt: { type: Date, default: null },
    payoutAmount: { type: Number, default: null },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

AiBotContractSchema.index({ user: 1, status: 1 });
AiBotContractSchema.index({ adminId: 1, status: 1, createdAt: -1 });

export default mongoose.model("AiBotContract", AiBotContractSchema);
