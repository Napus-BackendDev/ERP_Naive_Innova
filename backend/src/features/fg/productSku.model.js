import mongoose from "mongoose";

const ProductSkuSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    id: { type: String, required: true }, // e.g. SH-BIO-120ML-DM-OEM
    name: { type: String, required: true },
    brand: { type: String },
    category: { type: String },
    unit: { type: String, default: "ชิ้น" },
  },
  { timestamps: true }
);

ProductSkuSchema.index({ ownerId: 1, id: 1 });

export default mongoose.model("ProductSku", ProductSkuSchema);
