/**
 * Deposit promo / bonus codes (separate from signup InviteCode).
 */
import mongoose from "mongoose";

const { Schema } = mongoose;

const PromoCodeSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      minlength: 3,
      maxlength: 32,
    },
    type: {
      type: String,
      enum: ["flat_bonus", "percentage_bonus"],
      required: true,
    },
    value: { type: Number, required: true, min: 0 },
    active: { type: Boolean, default: true, index: true },
    minDeposit: { type: Number, default: 0, min: 0 },
    expiryDate: { type: Date, default: null },
    usedCount: { type: Number, default: 0, min: 0 },
    maxUses: { type: Number, default: 100, min: 1 },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    notes: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.PromoCode ||
  mongoose.model("PromoCode", PromoCodeSchema);
