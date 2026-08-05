/**
 * User orders / applications against platform catalog
 * (subscribe ETF, ICO, buy NFT, follow copy trader, loan request, C2C, convert).
 */
import mongoose from "mongoose";

const { Schema } = mongoose;

const PlatformOrderSchema = new Schema(
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
    kind: {
      type: String,
      enum: [
        "carbon_etf",
        "ico",
        "nft",
        "copy_trade",
        "ai_compute",
        "loan",
        "c2c",
        "convert",
        "transfer",
        "spot",
        "perpetual",
      ],
      required: true,
      index: true,
    },
    catalog: {
      type: Schema.Types.ObjectId,
      ref: "PlatformCatalog",
      default: null,
    },
    amount: { type: Number, default: 0 },
    fee: { type: Number, default: 0 },
    status: {
      type: String,
      enum: [
        "pending",
        "active",
        "completed",
        "rejected",
        "cancelled",
        "open",
        "filled",
      ],
      default: "pending",
      index: true,
    },
    side: {
      type: String,
      enum: ["buy", "sell", "long", "short", "in", "out", null],
      default: null,
    },
    symbol: { type: String, default: null },
    meta: { type: Schema.Types.Mixed, default: {} },
    reviewerNote: { type: String, default: null },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

PlatformOrderSchema.index({ user: 1, kind: 1, createdAt: -1 });
PlatformOrderSchema.index({ adminId: 1, status: 1, createdAt: -1 });

export default mongoose.model("PlatformOrder", PlatformOrderSchema);
