/**
 * =============================================================================
 *  NEXUS BACKEND — routes/chat.js
 * =============================================================================
 *  Chat between users and admin support (text + images).
 * =============================================================================
 */

import { Router } from "express";
import { body, validationResult } from "express-validator";
import mongoose from "mongoose";

import Message from "../models/Message.js";
import User from "../models/User.js";
import GatewaySetting from "../models/GatewaySetting.js";
import { requireAuth } from "../middleware/auth.js";
import { uploadProof, proofPublicUrl } from "../middleware/upload.js";

const router = Router();

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
      message: "Database is offline. Chat is temporarily unavailable.",
    });
  }
  return next();
};

async function resolveSender(req) {
  const dbUser = await User.findById(req.auth.sub).select("role deletedAt banned");
  const isAdmin = dbUser?.role === "admin";
  return { isAdmin, dbUser };
}

// ---------------------------------------------------------------------------
// POST /send
// ---------------------------------------------------------------------------
router.post(
  "/send",
  requireAuth,
  requireDatabase,
  [
    body("body")
      .isString()
      .trim()
      .isLength({ min: 1, max: 4000 })
      .withMessage("Message body is required (max 4000 chars)."),
    body("userId")
      .optional({ nullable: true, checkFalsy: true })
      .custom((v) => mongoose.isValidObjectId(v))
      .withMessage("Invalid userId."),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendValidationError(res, errors);

    const { isAdmin } = await resolveSender(req);
    let threadUserId;
    let from;
    let adminAuthor = null;

    if (isAdmin) {
      threadUserId = req.body.userId;
      if (!threadUserId) {
        return res.status(400).json({
          success: false,
          error: "BadRequestError",
          message: "Admin messages require a target `userId`.",
        });
      }
      from = "admin";
      adminAuthor = req.auth.sub;
    } else {
      threadUserId = req.auth.sub;
      from = "user";
    }

    const exists = await User.exists({
      _id: threadUserId,
      deletedAt: null,
    });
    if (!exists) {
      return res.status(404).json({
        success: false,
        error: "NotFoundError",
        message: "Target user not found.",
      });
    }

    const msg = await Message.create({
      user: threadUserId,
      from,
      body: req.body.body,
      messageType: "text",
      adminAuthor,
      readByAdmin: from === "admin",
      readByUser: from === "user",
    });

    return res.status(201).json({ success: true, message: msg });
  })
);

// ---------------------------------------------------------------------------
// POST /upload — text optional + image (user or admin)
// ---------------------------------------------------------------------------
router.post(
  "/upload",
  requireAuth,
  requireDatabase,
  (req, res, next) => {
    uploadProof.single("image")(req, res, (err) => {
      if (err) {
        return res.status(422).json({
          success: false,
          error: "ValidationError",
          message: err.message || "Invalid image.",
        });
      }
      return next();
    });
  },
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(422).json({
        success: false,
        error: "ValidationError",
        message: "Choose an image to upload.",
      });
    }

    const { isAdmin } = await resolveSender(req);
    let threadUserId;
    let from;
    let adminAuthor = null;

    if (isAdmin) {
      threadUserId = req.body.userId;
      if (!threadUserId || !mongoose.isValidObjectId(threadUserId)) {
        return res.status(400).json({
          success: false,
          error: "BadRequestError",
          message: "Admin image messages require a target `userId`.",
        });
      }
      from = "admin";
      adminAuthor = req.auth.sub;
    } else {
      threadUserId = req.auth.sub;
      from = "user";
    }

    const caption = (req.body.body || "").toString().trim() || "📷 Image";
    const attachmentUrl = proofPublicUrl(req.file.filename);

    const msg = await Message.create({
      user: threadUserId,
      from,
      body: caption,
      messageType: "text",
      attachmentUrl,
      adminAuthor,
      readByAdmin: from === "admin",
      readByUser: from === "user",
    });

    return res.status(201).json({ success: true, message: msg });
  })
);

// ---------------------------------------------------------------------------
// POST /deposit-details — push Gateway Settings into chat for this user
// ---------------------------------------------------------------------------
router.post(
  "/deposit-details",
  requireAuth,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const { isAdmin } = await resolveSender(req);
    const threadUserId = isAdmin ? req.body.userId : req.auth.sub;
    if (!threadUserId || !mongoose.isValidObjectId(threadUserId)) {
      return res.status(400).json({
        success: false,
        error: "BadRequestError",
        message: "Invalid user.",
      });
    }
    if (!isAdmin && threadUserId !== req.auth.sub) {
      return res.status(403).json({
        success: false,
        error: "ForbiddenError",
        message: "Forbidden.",
      });
    }

    const gw = await GatewaySetting.getSingleton();
    const lines = ["💳 Deposit details (from Admin Gateway Settings)", ""];
    if (gw.usdtTrc20Address) {
      lines.push(`USDT TRC-20:\n${gw.usdtTrc20Address}`);
    }
    if (gw.usdtErc20Address) {
      lines.push(`USDT ERC-20:\n${gw.usdtErc20Address}`);
    }
    if (gw.bankName || gw.accountNumber) {
      lines.push(
        `Bank: ${gw.bankName || "—"} · ${gw.accountTitle || ""} · ${
          gw.accountNumber || ""
        }`
      );
    }
    if (gw.easyPaisaNumber) lines.push(`EasyPaisa: ${gw.easyPaisaNumber}`);
    if (gw.jazzCashNumber) lines.push(`JazzCash: ${gw.jazzCashNumber}`);
    if (gw.instructions) lines.push(`\n${gw.instructions}`);
    if (
      !gw.usdtTrc20Address &&
      !gw.usdtErc20Address &&
      !gw.accountNumber &&
      !gw.easyPaisaNumber
    ) {
      lines.push(
        "No deposit rails configured yet. Admin: open Gateway Settings and save USDT TRC-20 address."
      );
    }
    lines.push(
      "\nAfter transfer, upload your payment screenshot here for approval."
    );

    const msg = await Message.create({
      user: threadUserId,
      from: "admin",
      body: lines.join("\n"),
      messageType: "system",
      adminAuthor: isAdmin ? req.auth.sub : null,
      readByAdmin: true,
      readByUser: false,
      meta: {
        kind: "deposit_details",
        usdtTrc20Address: gw.usdtTrc20Address || null,
      },
    });

    return res.status(201).json({
      success: true,
      message: msg,
      settings: {
        usdtTrc20Address: gw.usdtTrc20Address,
        usdtErc20Address: gw.usdtErc20Address,
        instructions: gw.instructions,
      },
    });
  })
);

// ---------------------------------------------------------------------------
// GET /history/:userId
// ---------------------------------------------------------------------------
router.get(
  "/history/:userId",
  requireAuth,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        error: "BadRequestError",
        message: "Invalid userId.",
      });
    }
    const { isAdmin } = await resolveSender(req);
    if (!isAdmin && userId !== req.auth.sub) {
      return res.status(403).json({
        success: false,
        error: "ForbiddenError",
        message: "You may only view your own message history.",
      });
    }

    const messages = await Message.find({ user: userId })
      .sort({ createdAt: 1 })
      .lean();

    return res.json({ success: true, messages });
  })
);

// ---------------------------------------------------------------------------
// GET /threads (admin)
// ---------------------------------------------------------------------------
router.get(
  "/threads",
  requireAuth,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const { isAdmin } = await resolveSender(req);
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: "ForbiddenError",
        message: "Admin privileges required.",
      });
    }

    const threads = await Message.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$user",
          lastMessage: { $first: "$$ROOT" },
          unread: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$from", "user"] },
                    { $eq: ["$readByAdmin", false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          total: { $sum: 1 },
        },
      },
      { $sort: { "lastMessage.createdAt": -1 } },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      { $match: { "user.deletedAt": null } },
      {
        $project: {
          _id: 1,
          unread: 1,
          total: 1,
          lastMessage: 1,
          "user._id": 1,
          "user.fullName": 1,
          "user.username": 1,
          "user.email": 1,
          "user.role": 1,
        },
      },
    ]);

    return res.json({ success: true, threads });
  })
);

// ---------------------------------------------------------------------------
// POST /mark-read
// ---------------------------------------------------------------------------
router.post(
  "/mark-read",
  requireAuth,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const { isAdmin } = await resolveSender(req);
    if (isAdmin) {
      const { userId } = req.body || {};
      if (!mongoose.isValidObjectId(userId)) {
        return res.status(400).json({
          success: false,
          error: "BadRequestError",
          message: "Invalid userId.",
        });
      }
      await Message.updateMany(
        { user: userId, from: "user", readByAdmin: false },
        { $set: { readByAdmin: true } }
      );
    } else {
      await Message.updateMany(
        { user: req.auth.sub, from: "admin", readByUser: false },
        { $set: { readByUser: true } }
      );
    }
    return res.json({ success: true });
  })
);

export default router;
