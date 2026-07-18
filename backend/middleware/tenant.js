/**
 * Multi-tenant isolation helpers for sub-admin routes.
 * SUPER_ADMIN → full visibility. ADMIN → only rows stamped with their adminId.
 */

import mongoose from "mongoose";
import User from "../models/User.js";
import { isSuperAdminRole } from "../lib/roles.js";

/** ObjectId of the tenant owner for a staff session (self for ADMIN). */
export function tenantOwnerId(req) {
  if (isSuperAdminRole(req.auth?.role)) return null;
  return req.auth?.sub || null;
}

/** True when the caller may see every tenant. */
export function isUnscoped(req) {
  return Boolean(req.isSuperAdmin || isSuperAdminRole(req.auth?.role));
}

/**
 * Mongo filter fragment for documents that carry denormalized `adminId`.
 * Super-admins get {}.
 */
export function tenantDocFilter(req) {
  if (isUnscoped(req)) return {};
  const id = tenantOwnerId(req);
  if (!id || !mongoose.isValidObjectId(id)) {
    return { adminId: { $exists: false, $eq: null } }; // match nothing useful
  }
  return { adminId: new mongoose.Types.ObjectId(id) };
}

/**
 * Mongo filter for User documents belonging to this admin's tenant.
 * Includes the admin account itself so they appear in overview counts safely.
 */
export function tenantUserFilter(req) {
  if (isUnscoped(req)) return {};
  const id = tenantOwnerId(req);
  if (!id || !mongoose.isValidObjectId(id)) {
    return { _id: { $exists: false } };
  }
  const oid = new mongoose.Types.ObjectId(id);
  return {
    $or: [{ adminId: oid }, { _id: oid }],
  };
}

/**
 * Load a user and enforce tenant ownership. Returns { user } or { status, message }.
 * SUPER_ADMIN may pass { allowDeleted: true } to open soft-deleted archive records.
 * Sub-admins never see soft-deleted users.
 */
export async function assertTenantUser(req, userId, { allowDeleted = false } = {}) {
  if (!mongoose.isValidObjectId(userId)) {
    return { status: 400, message: "Invalid user id." };
  }
  const user = await User.findById(userId);
  if (!user) {
    return { status: 404, message: "User not found." };
  }
  const canSeeDeleted = allowDeleted && isUnscoped(req);
  if (user.deletedAt && !canSeeDeleted) {
    return { status: 404, message: "User not found." };
  }
  if (isUnscoped(req)) return { user };

  const tid = String(tenantOwnerId(req) || "");
  const belongs =
    String(user.adminId || "") === tid || String(user._id) === tid;
  if (!belongs) {
    return { status: 404, message: "User not found." };
  }
  return { user };
}

/**
 * Ensure a document with `adminId` (or nested user.adminId) belongs to tenant.
 */
export function assertTenantDoc(req, doc) {
  if (!doc) return false;
  if (isUnscoped(req)) return true;
  const tid = String(tenantOwnerId(req) || "");
  if (!tid) return false;
  if (doc.adminId != null && String(doc.adminId) === tid) return true;
  if (doc.user?.adminId != null && String(doc.user.adminId) === tid) return true;
  return false;
}
