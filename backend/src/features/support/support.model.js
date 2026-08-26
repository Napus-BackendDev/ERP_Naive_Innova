import mongoose from "mongoose";

const SupportTicketSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    title: { type: String, required: true },
    category: { type: String, default: "other" },
    severity: { type: String, enum: ["low", "medium", "high", "critical"], default: "low" },
    description: { type: String, default: "" },
    contactEmail: { type: String, default: "" },
    reportedBy: { type: String, default: "" },
    status: { type: String, enum: ["open", "in_progress", "resolved", "closed"], default: "open" },
  },
  { timestamps: true }
);

SupportTicketSchema.index({ ownerId: 1, createdAt: -1 });

export default mongoose.model("SupportTicket", SupportTicketSchema);
