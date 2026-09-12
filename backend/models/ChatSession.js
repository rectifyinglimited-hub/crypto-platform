/**
 * One live support session per user. History messages stay in Message.
 */
import mongoose from "mongoose";

const { Schema } = mongoose;

export const CHAT_SESSION_MS = 30 * 60 * 1000;

const ChatSessionSchema = new Schema(
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
    status: {
      type: String,
      enum: ["open", "ended"],
      default: "open",
      index: true,
    },
    startedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    endedAt: { type: Date, default: null },
    endedBy: {
      type: String,
      enum: ["user", "admin", "timeout", null],
      default: null,
    },
  },
  { timestamps: true }
);

ChatSessionSchema.index({ user: 1, status: 1, startedAt: -1 });
ChatSessionSchema.index(
  { user: 1 },
  { unique: true, partialFilterExpression: { status: "open" } }
);

const ChatSession =
  mongoose.models.ChatSession ||
  mongoose.model("ChatSession", ChatSessionSchema);

export default ChatSession;
