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
        stakeThreshold: { type: Number, default: 100 },
        winPercentage: { type: Number, default: 25, min: 0, max: 100 },
        lowPattern: { type: [String], default: ["win", "loss", "loss", "loss"] },
        highPatternKey: {
          type: String,
          enum: ["A", "B", "C"],
          default: "A",
        },
      },
      default: () => ({
        enabled: true,
        stakeThreshold: 100,
        winPercentage: 25,
        lowPattern: ["win", "loss", "loss", "loss"],
        highPatternKey: "A",
      }),
    },
    /** Defaults for AI Bot Trading contracts */
    aiBotDefaults: {
      type: {
        defaultYieldPct: { type: Number, default: 8, min: 0, max: 500 },
        minPrincipal: { type: Number, default: 50 },
        lockOptions: { type: [Number], default: [7, 15, 30, 90] },
        contractVersion: { type: String, default: "v1.0" },
      },
      default: () => ({
        defaultYieldPct: 8,
        minPrincipal: 50,
        lockOptions: [7, 15, 30, 90],
        contractVersion: "v1.0",
      }),
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
