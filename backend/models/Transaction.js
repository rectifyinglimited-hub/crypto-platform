/**
 * =============================================================================
 *  NEXUS BACKEND — models/Transaction.js
 * =============================================================================
 *  Wallet transaction ledger:
 *    kind:   deposit | withdrawal | trade
 *    status: pending | approved | rejected | completed
 *
 *  Deposits/withdrawals start as `pending` and require admin approval,
 *  which flips them to `approved` and adjusts the user's wallet balance.
 *  Trades bypass approval and go straight to `completed`.
 * =============================================================================
 */
import mongoose from "mongoose";

const { Schema } = mongoose;

const TransactionSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    /** Tenant seal — parent ADMIN for deposit/trade isolation */
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    kind: {
      type: String,
      enum: ["deposit", "withdrawal", "trade"],
      required: true,
      index: true,
    },
    side: {
      // For trades only.
      type: String,
      enum: ["buy", "sell", null],
      default: null,
    },
    symbol: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    amount: { type: Number, required: true, min: 0 },
    usdValue: { type: Number, default: 0 },

    // For deposits/withdrawals
    network: { type: String, default: null }, // e.g. "TRC20"
    address: { type: String, default: null }, // withdraw destination or deposit hash
    txHash: { type: String, default: null },
    /** Public path to uploaded payment screenshot (deposits) */
    proofUrl: { type: String, default: null },
    /**
     * Withdrawals: true when amount was deducted on submit (held pending review).
     * Approve keeps hold; reject refunds.
     */
    fundsHeld: { type: Boolean, default: false },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "completed"],
      default: "pending",
      index: true,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: { type: Date, default: null },
    reviewerNote: { type: String, default: null },
  },
  { timestamps: true }
);

const Transaction =
  mongoose.models.Transaction ||
  mongoose.model("Transaction", TransactionSchema);
export default Transaction;
