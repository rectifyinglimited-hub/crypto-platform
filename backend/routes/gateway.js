/**
 * =============================================================================
 *  NEXUS BACKEND — routes/gateway.js
 * =============================================================================
 *  Read-only, authenticated exposure of the platform's deposit credentials.
 *  Regular users hit this when opening the Deposit tab so the Dashboard can
 *  render whatever bank / EasyPaisa / USDT rails the admin has configured.
 *    GET /api/gateway/current   — returns the singleton doc (fields may be null)
 * =============================================================================
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
    // Strip audit fields the user does not need to see.
    const {
      bankName,
      accountTitle,
      accountNumber,
      iban,
      easyPaisaNumber,
      jazzCashNumber,
      usdtTrc20Address,
      usdtErc20Address,
      instructions,
      updatedAt,
    } = doc;

    return res.json({
      success: true,
      settings: {
        bankName,
        accountTitle,
        accountNumber,
        iban,
        easyPaisaNumber,
        jazzCashNumber,
        usdtTrc20Address,
        usdtErc20Address,
        instructions,
        updatedAt,
      },
    });
  })
);

export default router;
