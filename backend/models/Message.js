/**
 * =============================================================================
 *  NEXUS BACKEND — models/Message.js
 * =============================================================================
 *  Chat message. Every thread is keyed by `user` (the customer's userId);
 *  admins post into that user's thread. `from` is the semantic sender role.
 * =============================================================================
 */
import mongoose from "mongoose";

const { Schema } = mongoose;

const MessageSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    from: {
      type: String,
      enum: ["user", "admin"],
      required: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 4000,
    },
    adminAuthor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    readByAdmin: { type: Boolean, default: false },
    readByUser: { type: Boolean, default: true },
  },
  { timestamps: true }
);

MessageSchema.index({ user: 1, createdAt: 1 });

const Message =
  mongoose.models.Message || mongoose.model("Message", MessageSchema);
export default Message;
