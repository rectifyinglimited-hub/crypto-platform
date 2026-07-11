/**
 * =============================================================================
 *  NEXUS BACKEND — routes/chat.js
 * =============================================================================
 *  Real-time-ish chat between a user and admin support.
 *
 *    POST  /api/chat/send                 Post a message
 *      • As a user: body { body } → thread is own userId, from="user"
 *      • As an admin: body { body, userId } → thread is userId, from="admin"
 *
 *    GET   /api/chat/history/:userId      Full ordered message list
 *      • Users may only fetch their own history
 *      • Admins may fetch any user's history
 *
 *    GET   /api/chat/threads              Admin-only: list active threads
 *
 *    POST  /api/chat/mark-read            User marks all as read
 * =============================================================================
 */

import { Router } from "express";
import { body, validationResult } from "express-validator";
import mongoose from "mongoose";

import Message from "../models/Message.js";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

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

    const isAdmin = req.auth.role === "admin";
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

    // Sanity: target user must exist
    const exists = await User.exists({ _id: threadUserId });
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
      adminAuthor,
      readByAdmin: from === "admin",
      readByUser: from === "user",
    });

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
    if (req.auth.role !== "admin" && userId !== req.auth.sub) {
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
// Returns one entry per user who has messaged, with last message + unread count.
// ---------------------------------------------------------------------------
router.get(
  "/threads",
  requireAuth,
  requireDatabase,
  asyncHandler(async (req, res) => {
    if (req.auth.role !== "admin") {
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
                { $and: [{ $eq: ["$from", "user"] }, { $eq: ["$readByAdmin", false] }] },
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
// POST /mark-read — user marks all admin messages as read (or vice versa)
// ---------------------------------------------------------------------------
router.post(
  "/mark-read",
  requireAuth,
  requireDatabase,
  asyncHandler(async (req, res) => {
    const isAdmin = req.auth.role === "admin";
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
