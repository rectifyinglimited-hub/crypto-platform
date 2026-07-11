/**
 * =============================================================================
 *  NEXUS BACKEND — middleware/admin.js
 * =============================================================================
 *  Role guard for admin-only routes. Must be chained AFTER `requireAuth`,
 *  since it reads `req.auth` populated by the JWT middleware.
 * =============================================================================
 */

export const requireAdmin = (req, res, next) => {
  if (!req.auth || req.auth.role !== "admin") {
    return res.status(403).json({
      success: false,
      error: "ForbiddenError",
      message: "Admin privileges are required to access this resource.",
    });
  }
  return next();
};

export default requireAdmin;
