/**
 * Platform deposit gateway — singleton.
 * Flexible rails (admin-named fields) + optional file uploads.
 * Legacy fixed columns kept for backward compatibility / chat TRC20 sync.
 */

import mongoose from "mongoose";

const { Schema } = mongoose;

const RailSchema = new Schema(
  {
    id: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true, maxlength: 80 },
    value: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const UploadSchema = new Schema(
  {
    id: { type: String, required: true, trim: true },
    fileName: { type: String, trim: true, default: "file" },
    mimeType: { type: String, trim: true, default: "application/octet-stream" },
    size: { type: Number, default: 0 },
    /** data: URL (image/pdf) — size capped in route validators */
    dataUrl: { type: String, default: "" },
  },
  { _id: false }
);

const DEFAULT_RAILS = [
  { id: "bank_name", label: "Bank Name", value: "" },
  { id: "account_title", label: "Account Title", value: "" },
  { id: "account_number", label: "Account Number", value: "" },
  { id: "iban", label: "IBAN (optional)", value: "" },
  { id: "easypaisa", label: "EasyPaisa Number", value: "" },
  { id: "jazzcash", label: "JazzCash Number", value: "" },
  { id: "usdt_trc20", label: "USDT TRC20 Address", value: "" },
  { id: "usdt_erc20", label: "USDT ERC20 Address", value: "" },
];

const LEGACY_MAP = {
  bank_name: "bankName",
  account_title: "accountTitle",
  account_number: "accountNumber",
  iban: "iban",
  easypaisa: "easyPaisaNumber",
  jazzcash: "jazzCashNumber",
  usdt_trc20: "usdtTrc20Address",
  usdt_erc20: "usdtErc20Address",
};

function railsFromLegacy(doc) {
  return DEFAULT_RAILS.map((r) => {
    const legacyKey = LEGACY_MAP[r.id];
    const v = legacyKey ? doc[legacyKey] : null;
    return {
      id: r.id,
      label: r.label,
      value: v != null && v !== "" ? String(v) : "",
    };
  });
}

function syncLegacyFromRails(doc) {
  const rails = Array.isArray(doc.rails) ? doc.rails : [];
  for (const [railId, legacyKey] of Object.entries(LEGACY_MAP)) {
    const hit = rails.find((r) => r.id === railId);
    if (hit) {
      const v = String(hit.value || "").trim();
      doc[legacyKey] = v || null;
    }
  }
  // Also pick TRC20 from any rail whose label mentions it
  if (!doc.usdtTrc20Address) {
    const trc = rails.find((r) => /trc\s*-?\s*20/i.test(r.label || ""));
    if (trc?.value) doc.usdtTrc20Address = String(trc.value).trim();
  }
}

const GatewaySettingSchema = new Schema(
  {
    /** Flexible deposit fields — admin can rename labels and add more */
    rails: { type: [RailSchema], default: () => [] },
    /** Optional images / PDFs / notes shown to users */
    uploads: { type: [UploadSchema], default: () => [] },
    instructions: { type: String, trim: true, default: null },

    // Legacy columns (kept in sync with rails for older clients / chat)
    bankName: { type: String, trim: true, default: null },
    accountTitle: { type: String, trim: true, default: null },
    accountNumber: { type: String, trim: true, default: null },
    iban: { type: String, trim: true, default: null },
    easyPaisaNumber: { type: String, trim: true, default: null },
    jazzCashNumber: { type: String, trim: true, default: null },
    usdtTrc20Address: { type: String, trim: true, default: null },
    usdtErc20Address: { type: String, trim: true, default: null },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

GatewaySettingSchema.statics.getSingleton = async function () {
  let doc = await this.findOne({});
  if (!doc) {
    doc = await this.create({ rails: DEFAULT_RAILS.map((r) => ({ ...r })) });
    return doc;
  }
  if (!Array.isArray(doc.rails) || doc.rails.length === 0) {
    doc.rails = railsFromLegacy(doc);
    await doc.save();
  }
  return doc;
};

GatewaySettingSchema.statics.DEFAULT_RAILS = DEFAULT_RAILS;
GatewaySettingSchema.statics.syncLegacyFromRails = syncLegacyFromRails;

const GatewaySetting =
  mongoose.models.GatewaySetting ||
  mongoose.model("GatewaySetting", GatewaySettingSchema);

export default GatewaySetting;
export { DEFAULT_RAILS, syncLegacyFromRails };
