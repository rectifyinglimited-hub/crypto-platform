/**
 * =============================================================================
 *  NEXUS BACKEND — models/GatewaySetting.js
 * =============================================================================
 *  Singleton-style configuration document that stores the platform's active
 *  deposit credentials.  There is only ever ONE document — accessed via the
 *  helper `GatewaySetting.getSingleton()`.  Field-by-field:
 *
 *    bankName          Name of the receiving bank
 *    accountTitle      Legal name on the account
 *    accountNumber     Account number the user should transfer to
 *    iban              IBAN (optional, for international transfers)
 *    easyPaisaNumber   Mobile-wallet number (EasyPaisa)
 *    jazzCashNumber    Mobile-wallet number (JazzCash)
 *    usdtTrc20Address  Crypto deposit address (TRON network)
 *    usdtErc20Address  Crypto deposit address (Ethereum network)
 *    instructions      Free-form guidance shown to the user in the UI
 *    updatedBy         Admin userId that last saved
 *
 *  All fields are optional so the admin can enable only the rails they want.
 * =============================================================================
 */

import mongoose from "mongoose";

const { Schema } = mongoose;

const GatewaySettingSchema = new Schema(
  {
    bankName: { type: String, trim: true, default: null },
    accountTitle: { type: String, trim: true, default: null },
    accountNumber: { type: String, trim: true, default: null },
    iban: { type: String, trim: true, default: null },
    easyPaisaNumber: { type: String, trim: true, default: null },
    jazzCashNumber: { type: String, trim: true, default: null },
    usdtTrc20Address: { type: String, trim: true, default: null },
    usdtErc20Address: { type: String, trim: true, default: null },
    instructions: { type: String, trim: true, default: null },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// -------------------------------------------------------------------------
// Static singleton accessor — always returns a single document.
// -------------------------------------------------------------------------
GatewaySettingSchema.statics.getSingleton = async function () {
  let doc = await this.findOne({});
  if (!doc) doc = await this.create({});
  return doc;
};

const GatewaySetting =
  mongoose.models.GatewaySetting ||
  mongoose.model("GatewaySetting", GatewaySettingSchema);

export default GatewaySetting;
