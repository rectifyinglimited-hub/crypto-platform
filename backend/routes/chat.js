/**
 * =============================================================================
 *  NEXUS BACKEND — routes/chat.js
 * =============================================================================
 *  Chat between users and admin support (text + images + deposit verification).
 * =============================================================================
 */

import { Router } from "express";
import { body, validationResult } from "express-validator";
import mongoose from "mongoose";
import fs from "node:fs";
import path from "node:path";

import Message from "../models/Message.js";
import User from "../models/User.js";
import GatewaySetting from "../models/GatewaySetting.js";
import { requireAuth } from "../middleware/auth.js";
import {
  uploadProof,
  proofPublicUrl,
  UPLOADS_DIR,
} from "../middleware/upload.js";
import { emitChatMessage } from "../socket.js";

const router = Router();

const VERIFICATION_HEADER = "Secure Payment Verification Channel";
const VERIFICATION_INSTRUCTIONS =
  "Please review the official TRC-20 settlement address below. Once your external transfer is complete, attach a clear photographic transaction receipt or hash snapshot using the attachment utility below for management validation.";

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
  const dbUser = await User.findById(req.auth.sub).select(
    "role deletedAt banned"
  );
  const isAdmin = dbUser?.role === "admin";
  return { isAdmin, dbUser };
}

function persistBase64Image(dataUrl) {
  const match = String(dataUrl || "").match(
    /^data:(image\/(?:png|jpe?g|webp|gif));base64,([A-Za-z0-9+/=\s]+)$/i
  );
  if (!match) {
    const err = new Error(
      "Invalid image payload. Use a PNG, JPEG, WEBP, or GIF data URL."
    );
    err.status = 422;
    throw err;
  }
  const mime = match[1].toLowerCase();
  const ext =
    mime.includes("png")
      ? ".png"
      : mime.includes("webp")
        ? ".webp"
        : mime.includes("gif")
          ? ".gif"
          : ".jpg";
  const buffer = Buffer.from(match[2].replace(/\s+/g, ""), "base64");
  if (!buffer.length || buffer.length > 6 * 1024 * 1024) {
    const err = new Error("Image must be under 6MB.");
    err.status = 422;
    throw err;
  }
  const filename = `proof-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}${ext}`;
  fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);
  return proofPublicUrl(filename);
}

async function createAttachmentMessage({
  threadUserId,
  from,
  adminAuthor,
  caption,
  attachmentUrl,
}) {
  const msg = await Message.create({
    user: threadUserId,
    from,
    body: caption || "Transaction receipt attached",
    messageType: "text",
    attachmentUrl,
    adminAuthor,
    readByAdmin: from === "admin",
    readByUser: from === "user",
  });
  emitChatMessage(threadUserId, msg);
  return msg;
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

    emitChatMessage(threadUserId, msg);
    return res.status(201).json({ success: true, message: msg });
  })
);

// ---------------------------------------------------------------------------
// POST /upload — multipart image (field: image) + optional caption
// ---------------------------------------------------------------------------
router.post(
  "/upload",
  requireAuth,
  requireDatabase,
  (req, res, next) => {
    // JSON base64 path (no multipart)
    if (
      req.is("application/json") &&
      typeof req.body?.image === "string" &&
      req.body.image.startsWith("data:image/")
    ) {
      return next();
    }
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

    let attachmentUrl = null;
    if (req.file) {
      attachmentUrl = proofPublicUrl(req.file.filename);
    } else if (
      typeof req.body?.image === "string" &&
      req.body.image.startsWith("data:image/")
    ) {
      attachmentUrl = persistBase64Image(req.body.image);
    } else {
      return res.status(422).json({
        success: false,
        error: "ValidationError",
        message: "Choose an image to upload.",
      });
    }

    const caption =
      (req.body.body || "").toString().trim() ||
      "Transaction receipt attached";

    const msg = await createAttachmentMessage({
      threadUserId,
      from,
      adminAuthor,
      caption,
      attachmentUrl,
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
    const lines = [VERIFICATION_HEADER, "", VERIFICATION_INSTRUCTIONS, ""];

    if (gw.usdtTrc20Address) {
      lines.push(`Official TRC-20 settlement address:\n${gw.usdtTrc20Address}`);
    } else {
      lines.push(
        "Official TRC-20 settlement address is not configured yet. An administrator will provide it shortly."
      );
    }

    if (gw.usdtErc20Address) {
      lines.push(`\nUSDT ERC-20 (secondary):\n${gw.usdtErc20Address}`);
    }
    if (gw.instructions) {
      lines.push(`\nAdditional settlement notes:\n${gw.instructions}`);
    }

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

    emitChatMessage(threadUserId, msg);

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

    // Strip legacy placeholder / non-local decorative media from history
    const cleaned = messages.map((m) => {
      const url = m.attachmentUrl || "";
      const isLocalUpload =
        typeof url === "string" &&
        (url.startsWith("/uploads/") || url.startsWith("data:image/"));
      const looksLikePlaceholder =
        /delta.?force|unsplash|picsum|placeholder|combat|banner/i.test(
          `${url} ${m.body || ""}`
        );
      if (url && (!isLocalUpload || looksLikePlaceholder)) {
        return { ...m, attachmentUrl: null };
      }
      return m;
    });

    return res.json({ success: true, messages: cleaned });
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
