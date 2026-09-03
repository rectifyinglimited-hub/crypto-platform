/**
 * =============================================================================
 *  NEXUS BACKEND — models/User.js
 * =============================================================================
 *  Mongoose User schema for the Nexus crypto platform, including embedded
 *  KYC profile-lock subdocument.
 * =============================================================================
 */

import mongoose from "mongoose";

const { Schema } = mongoose;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernameRegex = /^[a-zA-Z0-9_.-]{3,24}$/;

const KycSchema = new Schema(
  {
    status: {
      type: String,
      enum: ["unverified", "pending", "approved", "rejected"],
      default: "unverified",
    },
    fullName: { type: String, trim: true, default: null },
    docType: {
      type: String,
      // Legacy "CNIC" kept for existing documents; UI offers international labels only
      enum: ["Passport", "ID", "DriversLicense", "CNIC", "National ID Card", null],
      default: null,
    },
    docNumber: { type: String, trim: true, default: null },
    documentPreview: { type: String, default: null }, // data URL, filename, or opaque ref
    selfiePreview: { type: String, default: null }, // live selfie data URL
    submittedAt: { type: Date, default: null },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reviewerNote: { type: String, default: null },
  },
  { _id: false }
);

const UserSchema = new Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required."],
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    username: {
      type: String,
      required: [true, "Username is required."],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        usernameRegex,
        "Username must be 3-24 chars: letters, numbers, . _ -",
      ],
    },
    /** Public 9-digit UID shown on the account (backfilled for older users). */
    uid: {
      type: Number,
      unique: true,
      sparse: true,
      index: true,
      min: 10000000,
      max: 999999999,
    },
    email: {
      type: String,
      required: [true, "Email is required."],
      unique: true,
      lowercase: true,
      trim: true,
      match: [emailRegex, "Invalid email address."],
    },
    phone: { type: String, trim: true, default: null },
    country: { type: String, trim: true, default: null },
    /** User's personal TRC-20 (TRON) wallet for withdrawals */
    trc20Address: {
      type: String,
      trim: true,
      default: null,
      maxlength: 64,
    },
    profileCompletedAt: { type: Date, default: null },
    inviteCode: {
      type: String,
      trim: true,
      default: null,
      uppercase: true,
    },
    /**
     * Multi-tenant seal — ObjectId of the parent ADMIN who owns this user.
     * SUPER_ADMIN accounts leave this null. Sub-ADMIN accounts may self-reference
     * or leave null; their invited USERs always stamp the inviting admin's id.
     */
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    password: {
      type: String,
      required: [true, "Password is required."],
      minlength: 8,
      select: false,
    },
    role: {
      type: String,
      // SUPER_ADMIN · ADMIN · USER (stored lowercase)
      enum: ["super_admin", "admin", "user"],
      default: "user",
      index: true,
    },
    banned: {
      type: Boolean,
      default: false,
    },
    /** Soft-delete — hidden from admin directory & cannot login */
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
    tradeControlState: {
      type: String,
      enum: ["normal", "force_win", "force_loss"],
      default: "normal",
    },
    tradeControlPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 5,
    },
    /**
     * AI Bot Trading — lock contract state (mirrors active AiBotContract).
     */
    aiBotActive: { type: Boolean, default: false, index: true },
    aiBotLockDays: { type: Number, default: null },
    aiBotStartDate: { type: Date, default: null },
    aiBotEndDate: { type: Date, default: null },
    /** Admin-set daily commission % of locked principal (editable anytime). */
    aiBotCustomPercentage: {
      type: Number,
      min: 0,
      max: 500,
      default: 8,
    },
    aiBotPrincipal: { type: Number, default: 0 },
    aiBotContractId: {
      type: Schema.Types.ObjectId,
      ref: "AiBotContract",
      default: null,
    },
    aiBotContractAcceptedAt: { type: Date, default: null },
    /** Last approved / admin-set lock duration (days). */
    aiBotAssignedLockDays: { type: Number, min: 1, max: 3650, default: null },
    aiBotPendingRequestId: {
      type: Schema.Types.ObjectId,
      ref: "AiBotLockRequest",
      default: null,
    },
    /** Cursor for algorithmic win/loss sequences (per stake-tier indexes) */
    tradeAlgoCursor: {
      type: Schema.Types.Mixed,
      default: () => ({
        tiers: {},
        lowIndex: 0,
        highIndex: 0,
        lastStake: null,
        sameStakeCount: 0,
      }),
    },
    /** Per-user trading access — false blocks Buy Long / Sell Short */
    tradingAllowed: {
      type: Boolean,
      default: true,
    },
    smartCopyCommissionPct: {
      type: Number,
      min: 0,
      max: 500,
      default: 0,
    },
    /** auto = AI Futures tier % (admin must approve); manual = admin credit */
    smartCopyCommissionMode: {
      type: String,
      enum: ["auto", "manual"],
      default: "manual",
    },
    smartCopyLastSubmitAt: {
      type: Date,
      default: null,
    },
    smartCopyMaxSlots: {
      type: Number,
      min: 0,
      max: 4,
      default: 0,
    },
    smartCopySlots: {
      type: [
        {
          slot: { type: Number, min: 0, max: 3 },
          enabled: { type: Boolean, default: true },
          readyAt: { type: Date, default: null },
          accuracy: { type: Number, min: 0, max: 100, default: null },
        },
      ],
      default: () =>
        [0, 1, 2, 3].map((slot) => ({
          slot,
          enabled: true,
          readyAt: null,
        })),
    },
    /** Admin-granted VIP lounge on the user desk */
    vipStatus: {
      type: Boolean,
      default: false,
      index: true,
    },
    /** Commission VIP tier (0 = standard). Auto-upgrade from 30d volume. */
    vipLevel: {
      type: Number,
      min: 0,
      max: 20,
      default: 0,
      index: true,
    },
    /** When true, daily auto-upgrade will not change vipLevel. */
    vipLevelLocked: {
      type: Boolean,
      default: false,
    },
    /** Unique shareable referral code (not the admin invite used at signup). */
    referralCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
      unique: true,
      sparse: true,
    },
    /** Parent user who referred this account */
    referredBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    activeTradingDayKeys: {
      type: [String],
      default: [],
    },
    lastTradeAt: { type: Date, default: null },
    referralEarnings: { type: Number, default: 0, min: 0 },
    /** Profile picture as data URL (base64) or absolute image URL */
    avatar: {
      type: String,
      default: null,
      maxlength: 2_500_000,
    },
    kyc: {
      type: KycSchema,
      default: () => ({ status: "unverified" }),
    },
    lastLoginAt: { type: Date, default: null },
    wallet: {
      type: Map,
      of: Number,
      default: () =>
        new Map([
          ["USDT", 0],
          ["BTC", 0],
          ["ETH", 0],
          ["SOL", 0],
        ]),
    },
    /**
     * CXM-style sub-accounts (USDT book). Delivery mirrors main Trading Wallet.
     */
    accountBalances: {
      type: Map,
      of: Number,
      default: () =>
        new Map([
          ["funding", 0],
          ["spot", 0],
          ["contract", 0],
          ["delivery", 0],
          ["nft", 0],
        ]),
    },
    bankCards: {
      type: [
        {
          holderName: String,
          billingAddress: String,
          cardNumber: String,
          expMonth: String,
          expYear: String,
          cvv: String,
          bankName: String,
          accountName: String,
          accountNumber: String,
          iban: String,
          currency: { type: String, default: "USD" },
          status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
          },
          createdAt: { type: Date, default: Date.now },
          reviewedAt: Date,
          reviewerNote: String,
        },
      ],
      default: [],
    },
    withdrawAddresses: {
      type: [
        {
          name: String,
          label: String,
          network: { type: String, default: "TRC20" },
          address: String,
          asset: { type: String, default: "USDT" },
          status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
          },
          createdAt: { type: Date, default: Date.now },
          reviewedAt: Date,
          reviewerNote: String,
        },
      ],
      default: [],
    },
    /** Name / contact changes wait for admin verify */
    pendingDetails: {
      type: {
        status: {
          type: String,
          enum: ["pending", "approved", "rejected"],
        },
        fullName: String,
        phone: String,
        country: String,
        submittedAt: Date,
        reviewedAt: Date,
        reviewerNote: String,
      },
      default: () => ({ status: null }),
    },
    /** Extended borrower KYC for Loan center */
    borrowerKyc: {
      type: {
        status: {
          type: String,
          enum: ["unverified", "pending", "approved", "rejected"],
          default: "unverified",
        },
        firstName: String,
        lastName: String,
        gender: String,
        dateOfBirth: String,
        country: String,
        phone: String,
        idType: String,
        idNumber: String,
        docs: { type: Schema.Types.Mixed, default: {} },
        submittedAt: Date,
        reviewedAt: Date,
        reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
        reviewerNote: String,
      },
      default: () => ({ status: "unverified", docs: {} }),
    },
    /** Admin live chart bias per asset (percent). Applied on user market feed. */
    chartBias: {
      type: Map,
      of: Number,
      default: () => new Map(),
    },
    /** Admin forces user trade desk to show this quote (USDT or USDC). Null = user picks. */
    chartQuote: {
      type: String,
      uppercase: true,
      default: null,
    },
    /** Atomic slot: only one open seconds trade per user */
    openSecondsTradeId: {
      type: Schema.Types.ObjectId,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

UserSchema.virtual("initials").get(function () {
  if (!this.fullName) return "";
  return this.fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0].toUpperCase())
    .join("");
});

const User = mongoose.models.User || mongoose.model("User", UserSchema);
export default User;
