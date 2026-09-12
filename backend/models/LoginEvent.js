/**
 * One recorded sign-in. Super Admin login history only.
 */
import mongoose from "mongoose";

const { Schema } = mongoose;

const LoginEventSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    source: {
      type: String,
      enum: ["login", "register"],
      default: "login",
    },
    ip: { type: String, default: "", maxlength: 80 },
    kind: {
      type: String,
      enum: ["mobile", "web"],
      default: "web",
      index: true,
    },
    os: { type: String, default: "", maxlength: 40 },
    browser: { type: String, default: "", maxlength: 40 },
    userAgent: { type: String, default: "", maxlength: 400 },
    country: { type: String, default: "", maxlength: 80 },
    region: { type: String, default: "", maxlength: 80 },
    city: { type: String, default: "", maxlength: 80 },
    isp: { type: String, default: "", maxlength: 120 },
    locationLabel: { type: String, default: "Unknown", maxlength: 200 },
  },
  { timestamps: true }
);

LoginEventSchema.index({ user: 1, createdAt: -1 });
LoginEventSchema.index({ createdAt: -1 });

const LoginEvent =
  mongoose.models.LoginEvent || mongoose.model("LoginEvent", LoginEventSchema);

export default LoginEvent;
