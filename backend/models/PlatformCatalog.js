/**
 * Admin-configurable catalog for CXM-style products
 * (Carbon ETF, ICO, NFT, Copy traders, AI Compute plans, Loan settings).
 */
import mongoose from "mongoose";

const { Schema } = mongoose;

const PlatformCatalogSchema = new Schema(
  {
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
        "copy_trader",
        "ai_compute",
        "loan_plan",
        "c2c_ad",
        "market_pair",
      ],
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    subtitle: { type: String, trim: true, default: "", maxlength: 240 },
    description: { type: String, trim: true, default: "", maxlength: 4000 },
    price: { type: Number, default: 0 },
    currency: { type: String, default: "USDT", uppercase: true },
    enabled: { type: Boolean, default: true, index: true },
    featured: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    imageUrl: { type: String, default: null },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

PlatformCatalogSchema.index({ kind: 1, enabled: 1, sortOrder: 1 });

export default mongoose.model("PlatformCatalog", PlatformCatalogSchema);
