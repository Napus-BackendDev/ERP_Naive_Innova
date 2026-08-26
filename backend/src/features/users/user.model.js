import mongoose from "mongoose";

// Auth users ONLY. Sales leads / production orders were split out to the
// `Customer` collection (features/customers/customer.model.js) in the B2
// refactor — see backend/scripts/migrate-customers.js.
const UserSchema = new mongoose.Schema(
  {
    googleId: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    avatarUrl: { type: String },
    role: { type: mongoose.Schema.Types.ObjectId, ref: "Role" },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved"
    },
    approvalTokenHash: { type: String, select: false },
    approvalTokenExpiresAt: { type: Date, select: false },
    approvalEmailSentAt: { type: Date, select: false },
    approvedAt: { type: Date },
    rejectedAt: { type: Date },
    rejectedUntil: { type: Date },
    line: { type: String, default: "" },
    facebook: { type: String, default: "" },
    tiktok: { type: String, default: "" }
  },
  { timestamps: true }
);

export default mongoose.model("User", UserSchema);
