import mongoose from "mongoose";

const PackagingItemSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    type: { type: mongoose.Schema.Types.ObjectId, ref: "PackagingType" },
    customer: { type: String, required: true }, // "ระบบ" or specific customer name
    currentQuantity: { type: Number, default: 0 },
    // Reorder point in pieces; 0 = not set, the Cockpit falls back to its flat rule.
    minStock: { type: Number, default: 0 },
    image: { type: String }, // Base64 or URL
    note: { type: String },
  },
  { timestamps: true }
);

PackagingItemSchema.index({ ownerId: 1, name: 1 });

export default mongoose.model("PackagingItem", PackagingItemSchema);
