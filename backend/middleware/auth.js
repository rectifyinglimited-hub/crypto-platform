/**
 * =============================================================================
 *  NEXUS BACKEND — middleware/auth.js
 * =============================================================================
 *  Bearer-token JWT auth middleware. Attaches decoded payload to req.auth.
 * =============================================================================
 */

import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "nexus-dev-secret-change-me-in-production";

export const requireAuth = (req, res, next) => {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      success: false,
      error: "UnauthorizedError",
      message: "Missing or malformed Authorization header.",
    });
  }

  try {
    req.auth = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: "UnauthorizedError",
      message:
        err.name === "TokenExpiredError"
          ? "Session token has expired. Please sign in again."
          : "Invalid session token.",
    });
  }
};

export default requireAuth;
