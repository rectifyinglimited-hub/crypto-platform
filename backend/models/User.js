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
      enum: ["CNIC", "Passport", "ID", "DriversLicense", null],
      default: null,
    },
    docNumber: { type: String, trim: true, default: null },
    documentPreview: { type: String, default: null }, // filename or opaque ref
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
    password: {
      type: String,
      required: [true, "Password is required."],
      minlength: 8,
      select: false,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    banned: {
      type: Boolean,
      default: false,
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
    /** Admin live chart bias per asset (percent). Applied on user market feed. */
    chartBias: {
      type: Map,
      of: Number,
      default: () => new Map(),
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
