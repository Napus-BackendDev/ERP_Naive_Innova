import mongoose from "mongoose";

const BomFormulaSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    // Stable lookup key. Names remain editable display labels; consumers must
    // use _id/formulaId so a rename cannot orphan an order.
    normalizedName: { type: String, index: true },
    version: { type: Number, default: 1 },
    isArchived: { type: Boolean, default: false, index: true },
    archivedAt: { type: Date, default: null },
    color: { type: String, default: "#2E7D32" },
    bom: { type: Map, of: Number }, // Key: ingredient name, Value: grams per 1kg formula
    phases: { type: Map, of: String }, // Key: ingredient name, Value: phase letter (A, B, C, D, etc.)
    note: { type: [String], default: [] },
    procedures: { type: [String], default: [] },
    // QC acceptance spec for this formula (shown in R&D Incoming-QC panel). Was a
    // hardcoded "Specification - Mockup"; now real, editable per formula.
    qcSpec: {
      ph: { type: String, default: "" },
      viscosity: { type: String, default: "" },
      appearance: { type: String, default: "" },
      scent: { type: String, default: "" },
      fillVolume: { type: String, default: "" },
      note: { type: String, default: "" }
    },
    // QC checklist for this formula — typed items the R&D panel renders:
    //   { key, label, type: "passfail" | "passfail_photo" | "number", unit? }
    // Empty means the formula has no checklist configured yet; the panel then
    // refuses to pass QC rather than silently approving nothing.
    qcChecklistItems: { type: [mongoose.Schema.Types.Mixed], default: [] },
    // How to perform QC for this formula — authored in R&D "รับใบสั่งผลิต" and
    // shown read-only in the Incoming-QC panel. Free text (multi-line).
    qcMethod: { type: String, default: "" }
  },
  { timestamps: true }
);

BomFormulaSchema.index({ ownerId: 1, name: 1 });
// Sparse keeps legacy documents (which predate normalizedName) valid until the
// migration script fills their key. API-level checks still return a useful
// conflict when two active formulas normalize to the same name.
BomFormulaSchema.index({ ownerId: 1, normalizedName: 1 }, { unique: true, sparse: true });

export const normalizeFormulaName = (name) => String(name || "")
  .normalize("NFKC")
  .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, " ")
  .trim()
  .toLocaleLowerCase();

export default mongoose.model("BomFormula", BomFormulaSchema);
