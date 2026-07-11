/**
 * =============================================================================
 *  NEXUS BACKEND — routes/auth.js
 * =============================================================================
 *  Auth endpoints:
 *    POST   /api/auth/register     Create account (all Nexus profile fields)
 *    POST   /api/auth/login        Sign in
 *    GET    /api/auth/me           Current user (bearer required)
 *    POST   /api/auth/logout       Stateless logout
 *    POST   /api/auth/kyc          Submit KYC verification package
 *    GET    /api/auth/ping         Module heartbeat
 *
 *  On success, /register and /login return { success, token, user } — the
 *  frontend stores `token` in localStorage("nexus_token") and immediately
 *  transitions to the dashboard.
 * =============================================================================
 */

import { Router } from "express";
import { body, validationResult } from "express-validator";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const JWT_SECRET =
  process.env.JWT_SECRET || "nexus-dev-secret-change-me-in-production";
const JWT_TTL = process.env.JWT_TTL || "7d";
const BCRYPT_ROUNDS = 12;

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
    },
    JWT_SECRET,
    { expiresIn: JWT_TTL }
  );

const sanitizeUser = (user) => {
  const obj = user.toObject ? user.toObject() : { ...user };
  delete obj.password;
  delete obj.__v;
  return obj;
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
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .isLength({ min: 2, max: 32 })
    .withMessage("Invite code looks invalid."),
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
    if (!errors.isEmpty()) return sendValidationError(res, errors);

    const { fullName, username, email, password, phone, country, inviteCode } =
      req.body;

    // Uniqueness check on both email + username
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

    const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await User.create({
      fullName,
      username: username.toLowerCase(),
      email,
      password: hashed,
      phone: phone || null,
      country: country || null,
      inviteCode: inviteCode ? inviteCode.toUpperCase() : null,
    });

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
    if (!user) {
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
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "NotFoundError",
        message: "User no longer exists.",
      });
    }
    return res.status(200).json({ success: true, user: sanitizeUser(user) });
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

    if (fullName.length < 2 || fullName.length > 80) {
      return res.status(422).json({
        success: false,
        error: "ValidationError",
        message: "Full name is required (2-80 chars).",
      });
    }
    if (!["CNIC", "Passport", "ID", "DriversLicense"].includes(docType)) {
      return res.status(422).json({
        success: false,
        error: "ValidationError",
        message: "Document type must be one of CNIC, Passport, ID, DriversLicense.",
      });
    }
    if (docNumber.length < 4 || docNumber.length > 40) {
      return res.status(422).json({
        success: false,
        error: "ValidationError",
        message: "Document number must be 4-40 chars.",
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
