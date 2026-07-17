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
