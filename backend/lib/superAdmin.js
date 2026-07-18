/**
 * Sole platform SUPER_ADMIN identity.
 * Only this account may hold / use SUPER_ADMIN — others are demoted + sessions revoked.
 */

import { ROLES } from "./roles.js";

export function getSoleSuperAdmin() {
  return {
    email: (
      process.env.ADMIN_EMAIL ||
      process.env.SUPER_ADMIN_EMAIL ||
      "sohaib101malik@gmail.com"
    )
      .toString()
      .trim()
      .toLowerCase(),
    username: (process.env.ADMIN_USERNAME || "sohaib101malik")
      .toString()
      .trim()
      .toLowerCase(),
    password: (
      process.env.ADMIN_PASSWORD ||
      process.env.SUPER_ADMIN_PASSWORD ||
      "Google1234@"
    ).toString(),
    fullName: (process.env.ADMIN_FULL_NAME || "Sohaib Malik").toString(),
  };
}

export function isSoleSuperAdminIdentity(user) {
  if (!user) return false;
  const sole = getSoleSuperAdmin();
  const email = String(user.email || "")
    .trim()
    .toLowerCase();
  const username = String(user.username || "")
    .trim()
    .toLowerCase();
  return email === sole.email || username === sole.username;
}

/** True when a JWT/session must be killed (stale SUPER_ADMIN from another account). */
export function mustRevokeSuperAdminSession(authPayload, dbUser) {
  const claimedSuper =
    String(authPayload?.role || "").toLowerCase() === ROLES.SUPER_ADMIN;
  const dbSuper =
    String(dbUser?.role || "").toLowerCase() === ROLES.SUPER_ADMIN;
  if (!claimedSuper && !dbSuper) return false;
  return !isSoleSuperAdminIdentity(dbUser);
}
