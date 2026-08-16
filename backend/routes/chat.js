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
import { isStaffRole, isSuperAdminRole } from "../lib/roles.js";

const router = Router();

const VERIFICATION_HEADER = "Secure Payment Verification Channel";
const VERIFICATION_INSTRUCTIONS =
  "Please review the official TRC-20 settlement address below. Once your external transfer is complete, attach a clear photographic transaction receipt or hash snapshot using the attachment utility below for management validation.";

const TOPIC_BRIEFINGS = {
  vip: [
    "VIP lounge request",
    "",
    "Read this first, then send your message below. A manager will reply in this thread.",
    "",
    "How VIP works",
    "• Lounge VIP is granted by an administrator — priority Live Chat, personal manager, faster payout review.",
    "• Trading VIP (your referral commission %) upgrades automatically from 30-day trading volume. You do not request that here.",
    "",
    "Please send:",
    "1. Username on this account",
    "2. Approximate deposit / 30-day volume",
    "3. Why you want lounge VIP",
    "",
    "Optional: attach a recent deposit receipt. Do not share passwords.",
    "We will review and reply here.",
  ].join("\n"),
  loan: [
    "Loan desk",
    "",
    "Read these steps first, then message us below.",
    "",
    "1. Open Loan and complete Borrower Verification (ID front & back, selfie with ID, address proof).",
    "2. Wait until verification status is Approved.",
    "3. Then send in this chat:",
    "   • Amount in USDT",
    "   • Term in days",
    "   • Purpose of the loan",
    "4. Interest is shown on the Loan calculator before you submit. Every request is admin-reviewed.",
    "",
    "Do not send passwords or card PINs. A manager will reply here.",
  ].join("\n"),
  withdraw: [
    "Withdrawal desk",
    "",
    "Read this first, then send your message below.",
    "",
    "1. Add a crypto wallet or bank card in Assets and wait for admin approval.",
    "2. Submit the withdrawal form with the exact amount.",
    "3. Then message us here with:",
    "   • Amount and coin (usually USDT)",
    "   • Network (TRC20 / ERC20 / BEP20) or bank",
    "   • Destination wallet, or last 4 of the card",
    "4. Identity verification (KYC) should be approved for faster release.",
    "5. Payouts are staff-reviewed. Never send funds to a wallet posted by anyone except this official chat.",
    "",
    "Reply below. We will confirm next steps in this thread.",
  ].join("\n"),
  service: [
    "Customer Service",
    "",
    "You are in the live support thread.",
    "Tell us what you need (account, trade, KYC, or a problem).",
    "Include your username and a short description.",
    "",
    "Do not share passwords. A manager will reply here.",
  ].join("\n"),
  info: [
    "Information desk",
    "",
    "Binomo support — office and how to reach us:",
    "Dolphin Corp LLC",
    "Euro House, Richmond Hill Road",
    "Kingstown, St. Vincent and Grenadines",
    "Email: support@binomo.com",
    "",
    "Ask about accounts, deposits, VIP, loans, withdrawals, or trading.",
    "Type your question below. A manager will reply in this thread.",
  ].join("\n"),
};

const TOPIC_KEYS = Object.keys(TOPIC_BRIEFINGS);

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
    "role deletedAt banned adminId"
  );
  const isAdmin = isStaffRole(dbUser?.role);
  return { isAdmin, dbUser, isSuperAdmin: isSuperAdminRole(dbUser?.role) };
}

async function assertChatTenantAccess(req, threadUserId, sender) {
  if (!sender?.isAdmin || sender.isSuperAdmin) return true;
  const target = await User.findById(threadUserId).select("adminId");
  if (!target) return false;
  return String(target.adminId || "") === String(req.auth.sub);
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
  adminId = null,
  user = null,
}) {
  const msg = await Message.create({
    user: threadUserId,
    adminId,
    from,
    body: caption || "Transaction receipt attached",
    messageType: "text",
    attachmentUrl,
    adminAuthor,
    readByAdmin: from === "admin",
    readByUser: from === "user",
  });
  emitChatMessage(threadUserId, msg, { adminId, user });
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

    const sender = await resolveSender(req);
    const { isAdmin } = sender;
    let threadUserId;
    let from;
    let adminAuthor = null;
    let adminId = null;

    if (isAdmin) {
      threadUserId = req.body.userId;
      if (!threadUserId) {
        return res.status(400).json({
          success: false,
          error: "BadRequestError",
          message: "Admin messages require a target `userId`.",
        });
      }
      const allowed = await assertChatTenantAccess(req, threadUserId, sender);
      if (!allowed) {
        return res.status(404).json({
          success: false,
          error: "NotFoundError",
          message: "Target user not found.",
        });
      }
      from = "admin";
      adminAuthor = req.auth.sub;
      adminId = sender.isSuperAdmin ? null : req.auth.sub;
    } else {
      threadUserId = req.auth.sub;
      from = "user";
      adminId = sender.dbUser?.adminId || null;
    }

    // Super Admin may still open archived (soft-deleted) user threads
    const exists = await User.exists({
      _id: threadUserId,
      ...(sender.isSuperAdmin ? {} : { deletedAt: null }),
    });
    if (!exists) {
      return res.status(404).json({
        success: false,
        error: "NotFoundError",
        message: "Target user not found.",
      });
    }

    // Prefer denormalized tenant from target user when admin replies
    if (isAdmin) {
      const target = await User.findById(threadUserId).select("adminId");
      adminId = target?.adminId || adminId;
    }

    const msg = await Message.create({
      user: threadUserId,
      adminId,
      from,
      body: req.body.body,
      messageType: "text",
      adminAuthor,
      readByAdmin: from === "admin",
      readByUser: from === "user",
    });

    const userSummary =
      from === "user"
        ? {
            id: String(threadUserId),
            username: sender.dbUser?.username || null,
            email: sender.dbUser?.email || null,
            fullName: sender.dbUser?.fullName || null,
          }
        : null;
    emitChatMessage(threadUserId, msg, { adminId, user: userSummary });
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
    const sender = await resolveSender(req);
    const { isAdmin } = sender;
    let threadUserId;
    let from;
    let adminAuthor = null;
    let adminId = null;

    if (isAdmin) {
      threadUserId = req.body.userId;
      if (!threadUserId || !mongoose.isValidObjectId(threadUserId)) {
        return res.status(400).json({
          success: false,
          error: "BadRequestError",
          message: "Admin image messages require a target `userId`.",
        });
      }
      const allowed = await assertChatTenantAccess(req, threadUserId, sender);
      if (!allowed) {
        return res.status(404).json({
          success: false,
          error: "NotFoundError",
          message: "Target user not found.",
        });
      }
      from = "admin";
      adminAuthor = req.auth.sub;
      const target = await User.findById(threadUserId).select("adminId");
      adminId = target?.adminId || null;
    } else {
      threadUserId = req.auth.sub;
      from = "user";
      adminId = sender.dbUser?.adminId || null;
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

    const userSummary =
      from === "user"
        ? {
            id: String(threadUserId),
            username: sender.dbUser?.username || null,
            email: sender.dbUser?.email || null,
            fullName: sender.dbUser?.fullName || null,
          }
        : null;
    const msg = await createAttachmentMessage({
      threadUserId,
      from,
      adminAuthor,
      caption,
      attachmentUrl,
      adminId,
      user: userSummary,
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
    const sender = await resolveSender(req);
    const { isAdmin } = sender;
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
    if (isAdmin) {
      const allowed = await assertChatTenantAccess(req, threadUserId, sender);
      if (!allowed) {
        return res.status(404).json({
          success: false,
          error: "NotFoundError",
          message: "Target user not found.",
        });
      }
    }

    const gw = await GatewaySetting.getSingleton();
    const lines = [VERIFICATION_HEADER, "", VERIFICATION_INSTRUCTIONS, ""];

    const rails = Array.isArray(gw.rails) ? gw.rails : [];
    const filledRails = rails.filter((r) => String(r?.value || "").trim());
    if (filledRails.length) {
      lines.push("Deposit details:");
      for (const r of filledRails) {
        lines.push(`${r.label}:\n${String(r.value).trim()}`);
      }
    } else if (gw.usdtTrc20Address) {
      lines.push(`Official TRC-20 settlement address:\n${gw.usdtTrc20Address}`);
      if (gw.usdtErc20Address) {
        lines.push(`\nUSDT ERC-20 (secondary):\n${gw.usdtErc20Address}`);
      }
    } else {
      lines.push(
        "Official deposit rails are not configured yet. An administrator will provide them shortly."
      );
    }

    if (gw.instructions) {
      lines.push(`\nAdditional settlement notes:\n${gw.instructions}`);
    }
    if (Array.isArray(gw.uploads) && gw.uploads.length) {
      lines.push(
        `\nAttachments available in the Deposit tab (${gw.uploads.length} file${
          gw.uploads.length === 1 ? "" : "s"
        }).`
      );
    }

    const targetUser = await User.findById(threadUserId).select("adminId");
    const msg = await Message.create({
      user: threadUserId,
      adminId: targetUser?.adminId || null,
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
// POST /topic-briefing — VIP / loan / withdraw / service instructions
// ---------------------------------------------------------------------------
router.post(
  "/topic-briefing",
  requireAuth,
  requireDatabase,
  body("topic")
    .isIn(TOPIC_KEYS)
    .withMessage("Choose vip, loan, withdraw, service, or info."),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return sendValidationError(res, errors);

    const sender = await resolveSender(req);
    const { isAdmin } = sender;
    const topic = String(req.body.topic || "").toLowerCase();
    const threadUserId = isAdmin ? req.body.userId : req.auth.sub;
    if (!threadUserId || !mongoose.isValidObjectId(threadUserId)) {
      return res.status(400).json({
        success: false,
        error: "BadRequestError",
        message: "Invalid user.",
      });
    }
    if (!isAdmin && String(threadUserId) !== String(req.auth.sub)) {
      return res.status(403).json({
        success: false,
        error: "ForbiddenError",
        message: "Forbidden.",
      });
    }
    if (isAdmin) {
      const allowed = await assertChatTenantAccess(req, threadUserId, sender);
      if (!allowed) {
        return res.status(404).json({
          success: false,
          error: "NotFoundError",
          message: "Target user not found.",
        });
      }
    }

    const kind = `topic_${topic}`;
    const recent = await Message.findOne({
      user: threadUserId,
      from: "admin",
      "meta.kind": kind,
      createdAt: { $gte: new Date(Date.now() - 8 * 60 * 1000) },
    }).sort({ createdAt: -1 });
    if (recent) {
      return res.json({ success: true, message: recent, reused: true });
    }

    const targetUser = await User.findById(threadUserId).select("adminId");
    const msg = await Message.create({
      user: threadUserId,
      adminId: targetUser?.adminId || null,
      from: "admin",
      body: String(TOPIC_BRIEFINGS[topic] || "").slice(0, 4000),
      messageType: "system",
      adminAuthor: isAdmin ? req.auth.sub : null,
      readByAdmin: true,
      readByUser: false,
      meta: { kind, topic },
    });

    emitChatMessage(threadUserId, msg);
    return res.status(201).json({ success: true, message: msg });
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
    const sender = await resolveSender(req);
    const { isAdmin } = sender;
    if (isAdmin) {
      const allowed = await assertChatTenantAccess(req, userId, sender);
      if (!allowed) {
        return res.status(404).json({
          success: false,
          error: "NotFoundError",
          message: "Thread not found.",
        });
      }
    }
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
    const sender = await resolveSender(req);
    if (!sender.isAdmin) {
      return res.status(403).json({
        success: false,
        error: "ForbiddenError",
        message: "Admin privileges required.",
      });
    }

    const pipeline = [
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
    ];

    // Sub-admins: hide soft-deleted users + only own tenant threads
    // Super Admin: keep archived (deleted) user chats in history
    if (!sender.isSuperAdmin) {
      pipeline.push({ $match: { "user.deletedAt": null } });
      pipeline.push({
        $match: {
          "user.adminId": new mongoose.Types.ObjectId(req.auth.sub),
        },
      });
    }

    pipeline.push({
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
        "user.adminId": 1,
        "user.deletedAt": 1,
      },
    });

    const threads = await Message.aggregate(pipeline);

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
