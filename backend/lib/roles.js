/**
 * Platform role constants and helpers.
 * Application permissions: SUPER_ADMIN · ADMIN · USER
 * Stored in Mongo as lowercase snake_case for compatibility.
 */

export const ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  USER: "user",
};

export const STAFF_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN];

export const isStaffRole = (role) => STAFF_ROLES.includes(role);

export const isSuperAdminRole = (role) => role === ROLES.SUPER_ADMIN;

export const isAdminRole = (role) => role === ROLES.ADMIN;

export const roleLabel = (role) => {
  if (role === ROLES.SUPER_ADMIN) return "SUPER_ADMIN";
  if (role === ROLES.ADMIN) return "ADMIN";
  return "USER";
};
