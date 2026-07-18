/**
 * =============================================================================
 *  NEXUS BACKEND — routes/auth.js
 * =============================================================================
 *  Auth endpoints:
 *    POST   /api/auth/register     Create account · REQUIRES active invite code
 *    POST   /api/auth/login        Sign in
 *    GET    /api/auth/me           Current user (bearer required)
 *    POST   /api/auth/logout       Stateless logout
 *    POST   /api/auth/kyc          Submit KYC verification package
 *    GET    /api/auth/ping         Module heartbeat
 *
 *  Registration control
 *  --------------------
 *  From this build forward the register endpoint STRICTLY requires a valid
 *  invite code that maps to an `active` document in the `InviteCode`
 *  collection (created by an administrator).  Missing, empty, or unmatched
 *  codes trigger an immediate 403 with a precise operator-facing message:
 *
 *      { "message": "Registration Denied: A verified admin invitation
 *                    code is strictly required." }
 *
 *  When the code is accepted the redeeming user is appended to the code's
 *  `usedBy` array and inherits the role stamped on the code (`user` by
 *  default, `admin` for internal keys).
 * =============================================================================
 */

import { Router } from "express";
import { body, validationResult } from "express-validator";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import User from "../models/User.js";
import InviteCode from "../models/InviteCode.js";
import PlatformConfig from "../models/PlatformConfig.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const JWT_SECRET =
  process.env.JWT_SECRET || "nexus-dev-secret-change-me-in-production";
const JWT_TTL = process.env.JWT_TTL || "7d";
const BCRYPT_ROUNDS = 12;

const INVITE_REQUIRED_MESSAGE =
  "Valid Invitation Code is required to create an account.";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const sendValidationError = (res, errors) =>
  res.status(422).json({
    success: false,
    error: "ValidationError",
    message: "One or more fields are invalid.",
    details: errors.array().map((e) => ({
      field: e.path || e.param,
      message: e.msg,
    })),
  });

const requireDatabase = (_req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      error: "ServiceUnavailable",
      message:
        "Database is offline. Registration and authentication are temporarily unavailable.",
    });
  }
  return next();
};

const signToken = (user) =>
  jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      username: user.username,
      role: user.role,
      adminId: user.adminId ? String(user.adminId) : null,
    },
    JWT_SECRET,
    { expiresIn: JWT_TTL }
  );

const sanitizeUser = (user) => {
  const obj = user.toObject
    ? user.toObject({ virtuals: true })
    : { ...user };
  delete obj.password;
  delete obj.__v;
  // Normalize Map fields for JSON clients
  if (obj.wallet instanceof Map) {
    obj.wallet = Object.fromEntries(obj.wallet);
  } else if (obj.wallet && typeof obj.wallet === "object") {
    obj.wallet = { ...obj.wallet };
  }
  if (obj.chartBias instanceof Map) {
    obj.chartBias = Object.fromEntries(obj.chartBias);
  }
  obj.id = obj._id?.toString?.() || obj._id;
  return obj;
};

/**
 * Look up a candidate invite code and validate that it is redeemable.
 * Returns the code document on success, or throws an object shaped like
 *   { status, message } which the caller can convert to an HTTP response.
 */
const requireActiveInviteCode = async (raw) => {
  const denial = { status: 403, message: INVITE_REQUIRED_MESSAGE };
  if (typeof raw !== "string" || !raw.trim()) throw denial;

  const code = await InviteCode.findOne({ code: raw.trim().toUpperCase() });
  if (!code) throw denial;
  if (!code.active) throw denial;
  if (code.expiresAt && new Date(code.expiresAt) < new Date()) throw denial;
  if ((code.usedBy?.length || 0) >= (code.maxUses || 1)) throw denial;

  return code;
};

// ---------------------------------------------------------------------------
// Validation chains
// ---------------------------------------------------------------------------
const registerValidators = [
  body("fullName")
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage("Full name must be between 2 and 80 characters."),
  body("username")
    .trim()
    .matches(/^[a-zA-Z0-9_.-]{3,24}$/)
    .withMessage("Username must be 3-24 chars: letters, numbers, . _ -"),
  body("email")
    .trim()
    .isEmail()
    .withMessage("A valid email address is required.")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 8, max: 128 })
    .withMessage("Password must be at least 8 characters.")
    .matches(/[A-Z]/)
    .withMessage("Password must contain an uppercase letter.")
    .matches(/[a-z]/)
    .withMessage("Password must contain a lowercase letter.")
    .matches(/\d/)
    .withMessage("Password must contain a number."),
  body("phone")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .isLength({ min: 4, max: 24 })
    .withMessage("Phone number looks invalid."),
  body("country")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .isLength({ min: 2, max: 60 })
    .withMessage("Country must be a short string."),
  body("inviteCode")
    .exists({ checkNull: true, checkFalsy: true })
    .withMessage(INVITE_REQUIRED_MESSAGE)
    .bail()
    .isString()
    .isLength({ min: 2, max: 32 })
    .withMessage(INVITE_REQUIRED_MESSAGE),
];

const loginValidators = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("Valid email required.")
    .normalizeEmail(),
  body("password")
    .isString()
    .isLength({ min: 1 })
    .withMessage("Password required."),
];

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------
router.post(
  "/register",
  requireDatabase,
  registerValidators,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Invite-code specific validation errors should return the strict 403
      // shape the frontend banner is looking for.
      const inviteErr = errors
        .array()
        .find((e) => (e.path || e.param) === "inviteCode");
      if (inviteErr) {
        return res.status(403).json({
          success: false,
          error: "ForbiddenError",
          message: INVITE_REQUIRED_MESSAGE,
        });
      }
      return sendValidationError(res, errors);
    }

    const { fullName, username, email, password, phone, country, inviteCode } =
      req.body;

    // 1) Enforce invite code BEFORE anything else — no leaking uniqueness
    let inviteDoc;
    try {
      inviteDoc = await requireActiveInviteCode(inviteCode);
    } catch (denial) {
      return res.status(denial.status).json({
        success: false,
        error: "ForbiddenError",
        message: denial.message,
      });
    }

    // 2) Uniqueness (email + username)
    const clash = await User.findOne({
      $or: [{ email }, { username: username.toLowerCase() }],
    }).lean();
    if (clash) {
      const field = clash.email === email ? "email" : "username";
      return res.status(409).json({
        success: false,
        error: "ConflictError",
        message: `An account with that ${field} already exists.`,
      });
    }

    // 3) Create account with role from invite code + tenant stamp
    // Parent ADMIN id: invite.adminId → invite.createdBy (fallback)
    const parentAdminId = inviteDoc.adminId || inviteDoc.createdBy || null;
    const grantedRole =
      inviteDoc.role === "admin" ? "admin" : "user";

    const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await User.create({
      fullName,
      username: username.toLowerCase(),
      email,
      password: hashed,
      phone: phone || null,
      country: country || null,
      inviteCode: inviteDoc.code,
      role: grantedRole,
      // Stamp tenant: USERs map to parent admin; new ADMINs self-own their tenant
      adminId:
        grantedRole === "admin"
          ? null // set to self after create
          : parentAdminId,
    });

    if (grantedRole === "admin") {
      user.adminId = user._id;
      await user.save();
    }

    // 4) Consume the invite code (audit trail)
    inviteDoc.usedBy = inviteDoc.usedBy || [];
    inviteDoc.usedBy.push({ user: user._id, at: new Date() });
    await inviteDoc.save();

    // 5) Mark first login + sign JWT
    user.lastLoginAt = new Date();
    await user.save();
    const token = signToken(user);

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      token,
      user: sanitizeUser(user),
    });
  })
);

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
router.post(
  "/login",
  requireDatabase,
  loginValidators,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendValidationError(res, errors);

    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user || user.deletedAt) {
      return res.status(401).json({
        success: false,
        error: "UnauthorizedError",
        message: "Invalid email or password.",
      });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({
        success: false,
        error: "UnauthorizedError",
        message: "Invalid email or password.",
      });
    }

    if (user.banned) {
      return res.status(403).json({
        success: false,
        error: "ForbiddenError",
        message: "Your account has been suspended. Contact support.",
      });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = signToken(user);
    return res.status(200).json({
      success: true,
      message: "Signed in successfully.",
      token,
      user: sanitizeUser(user),
    });
  })
);

// ---------------------------------------------------------------------------
// GET /api/auth/me
// ---------------------------------------------------------------------------
router.get(
  "/me",
  requireAuth,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.auth.sub);
    if (!user || user.deletedAt) {
      return res.status(404).json({
        success: false,
        error: "NotFoundError",
        message: "User no longer exists.",
      });
    }
    if (user.banned) {
      return res.status(403).json({
        success: false,
        error: "ForbiddenError",
        message: "Your account has been suspended.",
      });
    }
    let globalTradingEnabled = true;
    try {
      const cfg = await PlatformConfig.getSingleton();
      globalTradingEnabled = cfg.globalTradingEnabled !== false;
    } catch {
      /* keep default */
    }
    return res.status(200).json({
      success: true,
      user: sanitizeUser(user),
      globalTradingEnabled,
    });
  })
);

// ---------------------------------------------------------------------------
// PUT /api/auth/profile — full name + TRC-20 + optional avatar
// ---------------------------------------------------------------------------
const TRC20_REGEX = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;
const AVATAR_MAX = 2_000_000;

router.put(
  "/profile",
  requireAuth,
  requireDatabase,
  [
    body("fullName")
      .isString()
      .trim()
      .isLength({ min: 2, max: 80 })
      .withMessage("Full name must be 2-80 characters."),
    // Empty string / null clears the saved wallet; non-empty must be valid TRC-20
    body("trc20Address")
      .optional({ nullable: true })
      .custom((v) => {
        if (v == null || v === "") return true;
        if (typeof v !== "string") return false;
        return TRC20_REGEX.test(v.trim());
      })
      .withMessage(
        "Enter a valid TRC-20 address (starts with T, 34 characters), or leave blank to remove."
      ),
    body("trc20AddressConfirm")
      .optional({ nullable: true })
      .isString()
      .withMessage("Confirm your TRC-20 address."),
    body("avatar")
      .optional({ nullable: true })
      .custom((v) => {
        if (v === null || v === "") return true;
        if (typeof v !== "string") return false;
        if (v.length > AVATAR_MAX) return false;
        return (
          v.startsWith("data:image/") ||
          /^https?:\/\//i.test(v)
        );
      })
      .withMessage("Avatar must be an image data URL or http(s) URL under 2MB."),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendValidationError(res, errors);

    const fullName = req.body.fullName.trim();
    const trc20Address = String(req.body.trc20Address ?? "").trim();
    const confirm = String(req.body.trc20AddressConfirm ?? "").trim();

    if (trc20Address !== confirm) {
      return res.status(422).json({
        success: false,
        error: "ValidationError",
        message: "TRC-20 addresses do not match. Please re-enter both fields.",
        details: [
          {
            field: "trc20AddressConfirm",
            message: "Must match the TRC-20 address exactly.",
          },
        ],
      });
    }

    const user = await User.findById(req.auth.sub);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "NotFoundError",
        message: "User not found.",
      });
    }

    user.fullName = fullName;
    // Empty string → null (wallet removed from profile)
    user.trc20Address = trc20Address || null;
    if (trc20Address) {
      user.profileCompletedAt = new Date();
    }
    if (Object.prototype.hasOwnProperty.call(req.body, "avatar")) {
      const raw = req.body.avatar;
      user.avatar = raw === "" || raw == null ? null : raw;
    }
    await user.save();

    return res.json({
      success: true,
      message: trc20Address
        ? "Profile saved successfully."
        : "Profile saved. TRC-20 wallet cleared.",
      user: sanitizeUser(user),
    });
  })
);

// ---------------------------------------------------------------------------
// PUT /api/auth/password — user changes own password
// ---------------------------------------------------------------------------
router.put(
  "/password",
  requireAuth,
  requireDatabase,
  [
    body("currentPassword").isString().isLength({ min: 1 }),
    body("newPassword")
      .isString()
      .isLength({ min: 8, max: 128 })
      .withMessage("New password must be at least 8 characters."),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendValidationError(res, errors);

    const user = await User.findById(req.auth.sub).select("+password");
    if (!user || user.deletedAt) {
      return res.status(404).json({
        success: false,
        error: "NotFoundError",
        message: "User not found.",
      });
    }

    const ok = await bcrypt.compare(req.body.currentPassword, user.password);
    if (!ok) {
      return res.status(401).json({
        success: false,
        error: "UnauthorizedError",
        message: "Current password is incorrect.",
      });
    }

    user.password = await bcrypt.hash(req.body.newPassword, BCRYPT_ROUNDS);
    await user.save();

    return res.json({
      success: true,
      message: "Password updated successfully.",
    });
  })
);

// ---------------------------------------------------------------------------
// POST /api/auth/logout — stateless.
// ---------------------------------------------------------------------------
router.post("/logout", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Signed out. Please discard your client-side token.",
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/kyc — submit KYC package (moves status → pending)
// ---------------------------------------------------------------------------
router.post(
  "/kyc",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: "ServiceUnavailable",
        message: "Database offline. KYC submission is temporarily unavailable.",
      });
    }

    const fullName = (req.body.fullName || "").toString().trim();
    const docType = (req.body.docType || "").toString().trim();
    const docNumber = (req.body.docNumber || "").toString().trim();
    const documentPreview =
      (req.body.documentPreview || "").toString().trim() || null;
    const selfiePreview =
      (req.body.selfiePreview || "").toString().trim() || null;

    if (fullName.length < 2 || fullName.length > 80) {
      return res.status(422).json({
        success: false,
        error: "ValidationError",
        message: "Full name is required (2-80 chars).",
      });
    }
    if (!["Passport", "ID", "DriversLicense"].includes(docType)) {
      return res.status(422).json({
        success: false,
        error: "ValidationError",
        message:
          "Document type must be one of National ID Card (ID), Passport, or Driver's License.",
      });
    }
    if (docNumber.length < 4 || docNumber.length > 40) {
      return res.status(422).json({
        success: false,
        error: "ValidationError",
        message: "Document number must be 4-40 chars.",
      });
    }
    if (!selfiePreview) {
      return res.status(422).json({
        success: false,
        error: "ValidationError",
        message: "Selfie verification photo is required.",
      });
    }

    const user = await User.findById(req.auth.sub);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "NotFoundError",
        message: "User not found.",
      });
    }
    if (user.kyc?.status === "approved") {
      return res.status(409).json({
        success: false,
        error: "ConflictError",
        message: "Your KYC is already approved.",
      });
    }
    if (user.kyc?.status === "pending") {
      return res.status(409).json({
        success: false,
        error: "ConflictError",
        message: "A KYC submission is already pending review.",
      });
    }

    user.kyc = {
      status: "pending",
      fullName,
      docType,
      docNumber,
      documentPreview,
      selfiePreview,
      submittedAt: new Date(),
      reviewedAt: null,
      reviewedBy: null,
      reviewerNote: null,
    };
    user.markModified("kyc");
    await user.save();

    return res.status(201).json({
      success: true,
      message: "KYC submitted for review.",
      user,
    });
  })
);

// ---------------------------------------------------------------------------
// GET /api/auth/ping
// ---------------------------------------------------------------------------
router.get("/ping", (_req, res) => {
  res.status(200).json({
    success: true,
    module: "auth",
    dbConnected: mongoose.connection.readyState === 1,
    timestamp: new Date().toISOString(),
  });
});

export default router;
