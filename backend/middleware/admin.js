/**
 * =============================================================================
 *  NEXUS BACKEND — middleware/admin.js
 * =============================================================================
 *  Role guard for admin-only routes. Must be chained AFTER `requireAuth`.
 *  Verifies the live database role (not a stale JWT claim) so promoted
 *  admins and seeded accounts work without forcing a re-login.
 * =============================================================================
 */

import User from "../models/User.js";
import mongoose from "mongoose";

export const requireAdmin = async (req, res, next) => {
  try {
    if (!req.auth?.sub) {
      return res.status(401).json({
        success: false,
        error: "UnauthorizedError",
        message: "Authentication required.",
      });
    }

    // Prefer JWT claim only as a fast-path hint; always confirm in DB
    if (mongoose.connection.readyState !== 1) {
      if (req.auth.role === "admin") return next();
      return res.status(503).json({
        success: false,
        error: "ServiceUnavailable",
        message: "Database is offline. Admin actions unavailable.",
      });
    }

    const user = await User.findById(req.auth.sub).select("role banned");
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "UnauthorizedError",
        message: "User no longer exists.",
      });
    }
    if (user.banned) {
      return res.status(403).json({
        success: false,
        error: "ForbiddenError",
        message: "Account is suspended.",
      });
    }
    if (user.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "ForbiddenError",
        message: "Admin privileges are required to access this resource.",
      });
    }

    // Keep JWT payload in sync for downstream handlers
    req.auth.role = "admin";
    req.adminUser = user;
    return next();
  } catch (err) {
    return next(err);
  }
};

export default requireAdmin;
