/**
 * Read-only deposit gateway for authenticated users.
 * GET /api/gateway/current
 */

import { Router } from "express";
import mongoose from "mongoose";

import GatewaySetting from "../models/GatewaySetting.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const requireDatabase = (_req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      error: "ServiceUnavailable",
      message: "Database offline. Deposit rails are temporarily unavailable.",
    });
  }
  return next();
};

router.get(
  "/current",
  requireAuth,
  requireDatabase,
  asyncHandler(async (_req, res) => {
    const doc = await GatewaySetting.getSingleton();
    const rails = (Array.isArray(doc.rails) ? doc.rails : [])
      .map((r) => ({
        id: r.id,
        label: r.label,
        value: r.value || "",
      }))
      .filter((r) => String(r.value || "").trim() !== "");

    const uploads = (Array.isArray(doc.uploads) ? doc.uploads : []).map((u) => ({
      id: u.id,
      fileName: u.fileName,
      mimeType: u.mimeType,
      size: u.size,
      dataUrl: u.dataUrl,
    }));

    return res.json({
      success: true,
      settings: {
        rails,
        uploads,
        instructions: doc.instructions,
        updatedAt: doc.updatedAt,
        // Legacy mirrors for older UI paths
        bankName: doc.bankName,
        accountTitle: doc.accountTitle,
        accountNumber: doc.accountNumber,
        iban: doc.iban,
        easyPaisaNumber: doc.easyPaisaNumber,
        jazzCashNumber: doc.jazzCashNumber,
        usdtTrc20Address: doc.usdtTrc20Address,
        usdtErc20Address: doc.usdtErc20Address,
      },
    });
  })
);

export default router;
