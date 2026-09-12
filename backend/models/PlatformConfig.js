/**
 * Singleton platform configuration (global trading kill-switch, etc.).
 */

import mongoose from "mongoose";

const { Schema } = mongoose;

const PlatformConfigSchema = new Schema(
  {
    globalTradingEnabled: {
      type: Boolean,
      default: true,
    },
    /** Dynamic win/loss sequence matrix for standard seconds trades */
    algoMatrix: {
      type: {
        enabled: { type: Boolean, default: true },
        useStakeTiers: { type: Boolean, default: true },
        stakeThreshold: { type: Number, default: 150 },
        winPercentage: { type: Number, default: 25, min: 0, max: 100 },
        lowPattern: { type: [String], default: ["win", "loss", "loss", "win"] },
        highPatternKey: {
          type: String,
          enum: ["A", "B", "C"],
          default: "A",
        },
        stakeTiers: { type: [Schema.Types.Mixed], default: [] },
      },
      default: () => ({
        enabled: true,
        useStakeTiers: true,
        stakeThreshold: 150,
        winPercentage: 25,
        lowPattern: ["win", "loss", "loss", "win"],
        highPatternKey: "A",
        stakeTiers: [],
      }),
    },
    /** Defaults for AI Bot Trading contracts */
    aiBotDefaults: {
      type: {
        defaultYieldPct: { type: Number, default: 8, min: 0, max: 500 },
        minPrincipal: { type: Number, default: 300 },
        lockOptions: { type: [Number], default: [40, 60, 90, 120] },
        contractVersion: { type: String, default: "v1.0" },
        /** Min-balance + lock-days commission rows (AI vs Smart Spot). */
        commissionTiers: { type: [Schema.Types.Mixed], default: [] },
      },
      default: () => ({
        defaultYieldPct: 1.25,
        minPrincipal: 300,
        lockOptions: [40, 60, 90, 120],
        contractVersion: "v1.0",
        commissionTiers: [],
      }),
    },
    /** Global Smart Spot block accuracy + open-at (one-click apply to all). */
    smartCopyDefaults: {
      type: {
        slots: { type: [Schema.Types.Mixed], default: [] },
      },
      default: () => ({ slots: [] }),
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

PlatformConfigSchema.statics.getSingleton = async function () {
  let doc = await this.findOne({});
  if (!doc) doc = await this.create({});
  return doc;
};

const PlatformConfig =
  mongoose.models.PlatformConfig ||
  mongoose.model("PlatformConfig", PlatformConfigSchema);

export default PlatformConfig;
