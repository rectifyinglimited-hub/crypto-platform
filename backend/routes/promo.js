/**
 * Deposit promo codes — validate/apply; admin CRUD.
 */
import { Router } from "express";
import mongoose from "mongoose";
import PromoCode from "../models/PromoCode.js";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";

const router = Router();

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

function requireDatabase(_req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      error: "DatabaseUnavailable",
      message: "Database is offline.",
    });
  }
  return next();
}

export function computePromoBonus(promo, depositAmount) {
  const amt = Number(depositAmount) || 0;
  if (!promo || !(amt > 0)) return 0;
  if (promo.type === "percentage_bonus") {
    return Number(((amt * Number(promo.value || 0)) / 100).toFixed(8));
  }
  return Number(Number(promo.value || 0).toFixed(8));
}

export async function validatePromoForDeposit(codeRaw, depositAmount) {
  const code = String(codeRaw || "")
    .trim()
    .toUpperCase();
  if (!code) {
    return { ok: false, message: "Enter a promo code." };
  }
  const promo = await PromoCode.findOne({ code });
  if (!promo || !promo.active) {
    return { ok: false, message: "Invalid or inactive promo code." };
  }
  if (promo.expiryDate && new Date(promo.expiryDate) < new Date()) {
    return { ok: false, message: "This promo code has expired." };
  }
  if (Number(promo.usedCount || 0) >= Number(promo.maxUses || 1)) {
    return { ok: false, message: "This promo code has reached max uses." };
  }
  const amt = Number(depositAmount) || 0;
  if (amt < Number(promo.minDeposit || 0)) {
    return {
      ok: false,
      message: `Minimum deposit for this code is $${Number(
        promo.minDeposit || 0
      ).toFixed(2)}.`,
    };
  }
  const bonus = computePromoBonus(promo, amt);
  return { ok: true, promo, bonus };
}

function serializePromo(p) {
  const doc = typeof p.toObject === "function" ? p.toObject() : { ...p };
  return {
    id: String(doc._id),
    _id: doc._id,
    code: doc.code,
    type: doc.type,
    value: doc.value,
    active: doc.active,
    minDeposit: doc.minDeposit,
    expiryDate: doc.expiryDate,
    usedCount: doc.usedCount,
    maxUses: doc.maxUses,
    notes: doc.notes,
    createdAt: doc.createdAt,
  };
}

// POST /apply — preview / validate (does not consume uses yet)
router.post(
  "/apply",
  requireAuth,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const result = await validatePromoForDeposit(
      req.body.code,
      req.body.amount
    );
    if (!result.ok) {
      return res.status(422).json({
        success: false,
        message: result.message,
      });
    }
    res.json({
      success: true,
      code: result.promo.code,
      type: result.promo.type,
      value: result.promo.value,
      bonus: result.bonus,
      message:
        result.promo.type === "percentage_bonus"
          ? `${result.promo.value}% bonus · +$${result.bonus.toFixed(2)} on approve`
          : `Flat bonus · +$${result.bonus.toFixed(2)} on approve`,
    });
  })
);

// Admin
router.get(
  "/admin",
  requireAuth,
  requireAdmin,
  requireDatabase,
  asyncHandler(async (_req, res) => {
    const list = await PromoCode.find().sort({ createdAt: -1 }).limit(200);
    res.json({ success: true, codes: list.map(serializePromo) });
  })
);

router.post(
  "/admin/generate",
  requireAuth,
  requireAdmin,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    const code = String(body.code || "")
      .trim()
      .toUpperCase();
    if (code.length < 3) {
      return res.status(422).json({
        success: false,
        message: "Code must be at least 3 characters.",
      });
    }
    const type =
      body.type === "percentage_bonus" ? "percentage_bonus" : "flat_bonus";
    const value = Number(body.value);
    if (!Number.isFinite(value) || value < 0) {
      return res.status(422).json({
        success: false,
        message: "Enter a valid bonus value.",
      });
    }
    try {
      const promo = await PromoCode.create({
        code,
        type,
        value,
        active: body.active !== false,
        minDeposit: Number(body.minDeposit || 0),
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
        maxUses: Number(body.maxUses || 100),
        notes: body.notes || null,
        adminId: req.auth.sub,
      });
      res.status(201).json({ success: true, code: serializePromo(promo) });
    } catch (err) {
      if (err?.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "That promo code already exists.",
        });
      }
      throw err;
    }
  })
);

router.patch(
  "/admin/:id",
  requireAuth,
  requireAdmin,
  requireDatabase,
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid id." });
    }
    const promo = await PromoCode.findById(req.params.id);
    if (!promo) {
      return res.status(404).json({ success: false, message: "Not found." });
    }
    const body = req.body || {};
    if (body.active !== undefined) promo.active = Boolean(body.active);
    if (body.maxUses !== undefined) promo.maxUses = Number(body.maxUses);
    if (body.minDeposit !== undefined) promo.minDeposit = Number(body.minDeposit);
    if (body.value !== undefined) promo.value = Number(body.value);
    if (body.expiryDate !== undefined) {
      promo.expiryDate = body.expiryDate ? new Date(body.expiryDate) : null;
    }
    if (body.notes !== undefined) promo.notes = body.notes;
    await promo.save();
    res.json({ success: true, code: serializePromo(promo) });
  })
);

router.delete(
  "/admin/:id",
  requireAuth,
  requireAdmin,
  requireDatabase,
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid id." });
    }
    await PromoCode.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  })
);

export default router;
