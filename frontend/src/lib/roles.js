/** Frontend role helpers — mirrors backend/lib/roles.js */

export const ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  USER: "user",
};

export const isStaffRole = (role) =>
  role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;

export const isSuperAdminRole = (role) => role === ROLES.SUPER_ADMIN;

export const roleLabel = (role) => {
  if (role === ROLES.SUPER_ADMIN) return "SUPER_ADMIN";
  if (role === ROLES.ADMIN) return "ADMIN";
  return "USER";
};
