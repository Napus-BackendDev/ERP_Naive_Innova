import mongoose from "mongoose";

const ProductLotSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // Back-reference to the production order (a "ลูกค้า" User doc) this lot was
    // produced from, so a finished good can be traced to its order/customer.
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    // How this lot came to exist. "production-qc" = auto-created when a
    // production order passed QC; "bom-confirm" = from BOM confirm-production;
    // "manual-recv" = hand-entered in the FG receiving form.
    source: { type: String, enum: ["production-qc", "bom-confirm", "manual-recv"], default: "manual-recv" },
    productId: { type: String }, // refers to ProductSku.id (optional, kept for backward compat)
    formulaId: { type: mongoose.Schema.Types.ObjectId, ref: "BomFormula" },
    formulaName: { type: String, default: "" }, // denormalized display snapshot / legacy fallback
    formulaVersion: { type: Number, default: null },
    formulaSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
    lotPrefix: { type: String, default: "" },   // e.g. "BS", "OS", "EF"
    lotNo: { type: String, required: true },
    mfgDate: { type: Date, required: true },
    expDate: { type: Date, required: true },
    quantity: { type: Number, required: true, default: 0 },
    unit: { type: String, default: "ชิ้น" },
    customer: { type: String },
    // "delivered" = handed to the customer, so the goods have left the warehouse.
    // Such lots are hidden from FG stock by default but stay in the DB for
    // history/traceability (GET /fg/lots?includeDelivered=true to see them).
    status: { type: String, enum: ["active", "expired", "recalled", "delivered"], default: "active" },
    deliveredAt: { type: Date },
    image: { type: String },
    bomPlan: { type: mongoose.Schema.Types.Mixed },
    // Which line-item of a multi-product order this lot is for (null = the whole
    // order / single-product). Lets each product of one order get its own lot.
    productIndex: { type: Number, default: null },
  },
  { timestamps: true }
);

ProductLotSchema.index({ ownerId: 1, formulaName: 1, expDate: 1 });
ProductLotSchema.index({ ownerId: 1, productId: 1, expDate: 1 });
ProductLotSchema.index({ orderId: 1 });
// At most one auto-created QC lot per (order, product line-item) — DB-level
// guard against two concurrent QC posts creating a duplicate lot. Keyed by
// productIndex (not formulaName) so two products sharing a formula still get
// distinct lots. NOTE: if a DB already built the older {orderId, formulaName}
// unique index, drop it: db.productlots.dropIndex("orderId_1_formulaName_1").
ProductLotSchema.index(
  { orderId: 1, productIndex: 1 },
  { unique: true, partialFilterExpression: { source: "production-qc", orderId: { $exists: true } } }
);

export default mongoose.model("ProductLot", ProductLotSchema);
