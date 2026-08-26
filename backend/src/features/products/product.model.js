import mongoose from "mongoose";

// Product = a finished "sample product" derived from a BOM formula. Persisted in the
// existing `products` collection. `isSample:true` marks the fake demo rows so they can be
// filtered (and cleanly removed) independently of any legacy product docs.
const ProductSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    formulaId: { type: mongoose.Schema.Types.ObjectId, ref: "BomFormula" },
    formulaName: { type: String, default: "" }, // source BOM formula name
    color: { type: String, default: "#2E7D32" },
    sku: { type: String, default: "" },
    brand: { type: String, default: "นาอีฟ" },
    category: { type: String, default: "สินค้าตัวอย่าง" },
    size: { type: String, default: "" }, // e.g. "50ml"
    currentQuantity: { type: Number, default: 0 },
    note: { type: String, default: "" },
    image: { type: String },
    isSample: { type: Boolean, default: false }
  },
  { timestamps: true, collection: "products" }
);

ProductSchema.index({ ownerId: 1, formulaName: 1, isSample: 1 });

export default mongoose.model("Product", ProductSchema);
