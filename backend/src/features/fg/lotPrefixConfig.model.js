import mongoose from "mongoose";

const LotPrefixConfigSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // Stable BOM link; formulaName remains for legacy configs and display.
    formulaId: { type: mongoose.Schema.Types.ObjectId, ref: "BomFormula" },
    formulaName: { type: String, required: true }, // e.g. "Bio-Shampoo"
    prefix: { type: String, required: true, maxlength: 6 }, // e.g. "BS"
    description: { type: String, default: "" }, // e.g. "ชื่อสินค้าสำหรับแสดง"
  },
  { timestamps: true }
);

LotPrefixConfigSchema.index({ ownerId: 1, formulaName: 1 }, { unique: true });
LotPrefixConfigSchema.index({ ownerId: 1, formulaId: 1 }, { unique: true, sparse: true });

export default mongoose.model("LotPrefixConfig", LotPrefixConfigSchema);
