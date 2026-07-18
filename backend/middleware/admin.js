/**
 * =============================================================================
 *  NEXUS BACKEND — middleware/admin.js
 * =============================================================================
 *  Role guards for ADMIN + SUPER_ADMIN routes. Must be chained AFTER requireAuth.
 *  Verifies the live database role (not a stale JWT claim).
 * =============================================================================
 */

import User from "../models/User.js";
import mongoose from "mongoose";
import { isStaffRole, isSuperAdminRole, ROLES } from "../lib/roles.js";
import { isSoleSuperAdminIdentity } from "../lib/superAdmin.js";

const attachStaffContext = (req, user) => {
  req.auth.role = user.role;
  req.auth.adminId = user.adminId ? String(user.adminId) : null;
  req.adminUser = user;
  req.isSuperAdmin = isSuperAdminRole(user.role);
  // Tenant owner id for query filters (null = unscoped super admin)
  req.tenantAdminId = req.isSuperAdmin ? null : String(user._id);
};

export const requireAdmin = async (req, res, next) => {
  try {
    if (!req.auth?.sub) {
      return res.status(401).json({
        success: false,
        error: "UnauthorizedError",
        message: "Authentication required.",
      });
    }

    if (mongoose.connection.readyState !== 1) {
      if (isStaffRole(req.auth.role)) {
        req.isSuperAdmin = isSuperAdminRole(req.auth.role);
        req.tenantAdminId = req.isSuperAdmin ? null : String(req.auth.sub);
        return next();
      }
      return res.status(503).json({
        success: false,
        error: "ServiceUnavailable",
        message: "Database is offline. Admin actions unavailable.",
      });
    }

    const user = await User.findById(req.auth.sub).select(
      "role banned adminId deletedAt"
    );
    if (!user || user.deletedAt) {
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
    if (!isStaffRole(user.role)) {
      return res.status(403).json({
        success: false,
        error: "ForbiddenError",
        message: "Admin privileges are required to access this resource.",
      });
    }

    attachStaffContext(req, user);
    return next();
  } catch (err) {
    return next(err);
  }
};

/** SUPER_ADMIN-only gate (Admin Manager suite). */
export const requireSuperAdmin = async (req, res, next) => {
  try {
    if (!req.auth?.sub) {
      return res.status(401).json({
        success: false,
        error: "UnauthorizedError",
        message: "Authentication required.",
      });
    }

    if (mongoose.connection.readyState !== 1) {
      if (isSuperAdminRole(req.auth.role)) {
        req.isSuperAdmin = true;
        req.tenantAdminId = null;
        return next();
      }
      return res.status(503).json({
        success: false,
        error: "ServiceUnavailable",
        message: "Database is offline. Admin actions unavailable.",
      });
    }

    const user = await User.findById(req.auth.sub).select(
      "role banned adminId deletedAt email username"
    );
    if (!user || user.deletedAt) {
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
    if (!isSuperAdminRole(user.role) || !isSoleSuperAdminIdentity(user)) {
      if (isSuperAdminRole(user.role) && !isSoleSuperAdminIdentity(user)) {
        user.role = ROLES.USER;
        await user.save();
      }
      return res.status(401).json({
        success: false,
        error: "UnauthorizedError",
        message:
          "Super Admin session revoked. Sign in with the authorized account only.",
      });
    }

    attachStaffContext(req, user);
    return next();
  } catch (err) {
    return next(err);
  }
};

export { ROLES };
export default requireAdmin;
