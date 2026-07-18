/**
 * =============================================================================
 *  NEXUS BACKEND — seed-admin.js
 * =============================================================================
 *  One-shot script to create (or promote) the platform SUPER_ADMIN account.
 *  Run once from the backend folder:
 *
 *      npm run seed:admin
 *
 *  Default credentials (override via env vars):
 *      ADMIN_EMAIL     sohaib101malik@gmail.com
 *      ADMIN_USERNAME  sohaib101malik
 *      ADMIN_PASSWORD  Google1234@
 * =============================================================================
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

import User from "./models/User.js";
import { ROLES } from "./lib/roles.js";

dotenv.config();

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/nexus_dev";

const ADMIN_FULL_NAME = process.env.ADMIN_FULL_NAME || "Sohaib Malik";
const ADMIN_USERNAME = (
  process.env.ADMIN_USERNAME || "sohaib101malik"
).toLowerCase();
const ADMIN_EMAIL = (
  process.env.ADMIN_EMAIL || "sohaib101malik@gmail.com"
).toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Google1234@";

const BCRYPT_ROUNDS = 12;

const seed = async () => {
  console.log("\x1b[36m[seed]\x1b[0m Connecting to MongoDB…");
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 8000 });
  console.log("\x1b[32m[seed]\x1b[0m Connected.");

  const hashed = await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_ROUNDS);

  let user = await User.findOne({
    $or: [{ email: ADMIN_EMAIL }, { username: ADMIN_USERNAME }],
  }).select("+password");

  if (user) {
    user.fullName = ADMIN_FULL_NAME;
    user.username = ADMIN_USERNAME;
    user.email = ADMIN_EMAIL;
    user.password = hashed;
    user.role = ROLES.SUPER_ADMIN;
    user.adminId = null;
    user.banned = false;
    await user.save();
    console.log(
      "\x1b[33m[seed]\x1b[0m Existing account found — promoted to SUPER_ADMIN & password reset."
    );
  } else {
    user = await User.create({
      fullName: ADMIN_FULL_NAME,
      username: ADMIN_USERNAME,
      email: ADMIN_EMAIL,
      password: hashed,
      role: ROLES.SUPER_ADMIN,
      adminId: null,
    });
    console.log("\x1b[32m[seed]\x1b[0m New SUPER_ADMIN account created.");
  }

  console.log("\n\x1b[36m===========================================\x1b[0m");
  console.log("  NEXUS SUPER ADMIN CREDENTIALS");
  console.log("\x1b[36m===========================================\x1b[0m");
  console.log(`  Full name : ${ADMIN_FULL_NAME}`);
  console.log(`  Username  : ${ADMIN_USERNAME}`);
  console.log(`  Email     : ${ADMIN_EMAIL}`);
  console.log(`  Password  : ${ADMIN_PASSWORD}`);
  console.log(`  Role      : SUPER_ADMIN`);
  console.log("\x1b[36m===========================================\x1b[0m\n");

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch(async (err) => {
  console.error("\x1b[31m[seed]\x1b[0m Failed:", err?.message || err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
