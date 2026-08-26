import mongoose from "mongoose";

// ---------------------------------------------------------------------------
// Typed schema for one ordered product line-item (B1 fix).
// Previously orderedProducts was Mixed and live data held three shapes:
// array-of-objects, array-of-strings, and a single bare object. This schema
// makes array-of-objects the only shape. `strict: false` keeps any extra
// wizard fields written by older frontends instead of silently dropping them.
// ---------------------------------------------------------------------------
const orderProductSchema = new mongoose.Schema(
  {
    formulaId: { type: mongoose.Schema.Types.ObjectId, ref: "BomFormula" },
    formulaName: { type: String, default: "" },
    quantityKg: { type: mongoose.Schema.Types.Mixed, default: "" },
    quantityPcs: { type: mongoose.Schema.Types.Mixed, default: "" },
    bottleSize: { type: String, default: "" },

    // Packaging / label links: *Id is the enforceable ObjectId link,
    // *Type keeps a denormalized name snapshot for display.
    packagingType: { type: String, default: "" },
    packagingItemId: { type: mongoose.Schema.Types.ObjectId, ref: "PackagingItem" },
    labelType: { type: String, default: "" },
    labelItemId: { type: mongoose.Schema.Types.ObjectId, ref: "PackagingItem" },
    scentId: { type: mongoose.Schema.Types.ObjectId, ref: "Scent" },
    scentType: { type: String, default: "" },
    nozzleId: { type: mongoose.Schema.Types.ObjectId, ref: "Nozzle" },
    nozzleType: { type: String, default: "" },

    // Detailed spec fields from the sales order modal
    brand: { type: String, default: "" },
    customerName: { type: String, default: "" },
    customerFormulaType: { type: String, default: "" },
    fillVolume: { type: mongoose.Schema.Types.Mixed, default: "" },
    bottleCount: { type: mongoose.Schema.Types.Mixed, default: "" },
    nozzleCount: { type: mongoose.Schema.Types.Mixed, default: "" },
    bottlesDelivered: { type: Boolean, default: false },
    autoMfgDate: { type: Boolean, default: true },
    mfgDate: { type: String, default: "" },
    expDate: { type: String, default: "" },
    printLocation: { type: String, default: "" },
    notifyLot: { type: Boolean, default: false },
    stickerWidth: { type: mongoose.Schema.Types.Mixed, default: "" },
    stickerHeight: { type: mongoose.Schema.Types.Mixed, default: "" },
    stickerOrderer: { type: String, default: "" },
    stickerStatus: { type: String, default: "" },
    labelArtworkUrl: { type: String, default: "" },
    // Per-order finished-product photo the customer uploads in the Sales spec modal
    // (multer URL from /production/upload). Flows downstream to Production/R&D display.
    productImageUrl: { type: String, default: "" },
    notes: { type: String, default: "" },

    // Development-formula order flag (was a bare non-array object before)
    isDevelopment: { type: Boolean, default: false },

    // Per-product production/QC state (written via orderedProducts.$idx.*)
    productionStatus: { type: String, default: "" },
    productionStep: { type: Number },
    isStockDeducted: { type: Boolean, default: false },
    isConfirmed: { type: Boolean },
    producedLotId: { type: mongoose.Schema.Types.ObjectId, ref: "ProductLot" },
    consumedPackaging: [
      {
        itemId: { type: mongoose.Schema.Types.ObjectId, ref: "PackagingItem" },
        name: { type: String, default: "" },
        qty: { type: Number, default: 0 }
      }
    ],
    packagingChecklist: { type: mongoose.Schema.Types.Mixed, default: null },
    lotStampNo: { type: String, default: "" },
    lotStampMfg: { type: String, default: "" },
    lotStampExp: { type: String, default: "" },
    chatScreenshotProof: { type: String, default: "" },
    qcPackagingPhoto: { type: String, default: "" },
    qcPumpPhoto: { type: String, default: "" },
    qcStickerPhoto: { type: String, default: "" },
    qcAssembledVideo: { type: String, default: "" },
    rndQcChecklist: { type: mongoose.Schema.Types.Mixed, default: null },
    rndQcPhotos: { type: [String], default: [] },
    rndQcAt: { type: Date },

    // Machine-timeline schedule. Set via PUT /production/orders/:id/schedule —
    // planning only, no stock side effects. machineId matches the client-side
    // machine list id (e.g. "m1").
    scheduleMachineId: { type: String, default: "" },
    // Real calendar dates ("YYYY-MM-DD") — the source of truth for placement.
    // Replaces the old floating weekday index, which was never anchored to a
    // week: an order stored as "จันทร์" re-rendered on Monday of whatever week
    // the user scrolled to. A date pins the block to its true day in every view.
    scheduleStartDate: { type: String, default: "" },
    scheduleEndDate: { type: String, default: "" },
    // Stack order within the same machine+date. DERIVED on drop
    // (max(queueNo on that machine+date) + 1) — never typed by a user.
    scheduleQueueNo: { type: Number, default: null },

    // --- LEGACY (read-only fallback; no longer written) ---
    // Floating 0-6 weekday index (จ.=0 .. อา.=6) + the view it was captured in.
    // Kept so orders scheduled before the date migration still render.
    // See backend/scripts/migrate-schedule-to-dates.js.
    scheduleStartDay: { type: Number, default: null },
    scheduleEndDay: { type: Number, default: null },
    scheduleView: { type: String, default: "weekly" }
  },
  { _id: false, strict: false }
);

// Optional link fields typed as ObjectId. The sales modal inits these to "" and
// posts them blank when the user doesn't pick a packaging/label/scent/nozzle,
// but "" can't cast to ObjectId — Mongoose throws a validation 500. Strip blanks
// so the link is simply absent instead of crashing the whole order.
const BLANK_OBJECTID_KEYS = [
  "formulaId", "packagingItemId", "labelItemId", "scentId", "nozzleId", "producedLotId"
];
// Numeric fields that also can't cast from "".
const BLANK_NUMBER_KEYS = ["productionStep", "scheduleStartDay", "scheduleEndDay"];

// Remove empty-string values for typed (ObjectId/Number) fields on one line item
// so an unselected optional field is dropped rather than cast-failed.
export function stripBlankTypedFields(item) {
  if (!item || typeof item !== "object") return item;
  for (const key of BLANK_OBJECTID_KEYS) {
    if (item[key] === "" || item[key] === null) delete item[key];
  }
  for (const key of BLANK_NUMBER_KEYS) {
    if (item[key] === "") delete item[key];
  }
  if (Array.isArray(item.consumedPackaging)) {
    item.consumedPackaging = item.consumedPackaging
      .filter(cp => cp && typeof cp === "object")
      .map(cp => {
        if (cp.itemId === "" || cp.itemId === null) delete cp.itemId;
        return cp;
      });
  }
  return item;
}

// Normalize any legacy orderedProducts shape into array-of-objects:
//   null/undefined       -> []
//   "Product name"       -> [{ formulaName: "Product name" }]
//   { ...single object } -> [{ ...single object }]
//   [mixed strings/objs] -> objects, strings coerced
// Blank typed fields (ObjectId/Number = "") are stripped so unselected optional
// links don't crash validation.
export function normalizeOrderedProducts(raw) {
  if (raw === null || raw === undefined || raw === "") return [];
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr
    .filter(item => item !== null && item !== undefined && item !== "")
    .map(item => {
      if (typeof item === "string") return { formulaName: item };
      if (typeof item === "object") return stripBlankTypedFields({ ...item });
      return { formulaName: String(item) };
    });
}

// ---------------------------------------------------------------------------
// Customer (B2 fix) — sales leads / production orders live here now, fully
// separated from the auth `User` collection. _ids are preserved from the old
// users collection by the migration script so existing cross-refs
// (ProductLot.orderId, ActivityLog, CustomerLog.customerId, ...) stay valid.
// ---------------------------------------------------------------------------
const CustomerSchema = new mongoose.Schema(
  {
    // Identity / contact
    email: { type: String, default: "" },
    name: { type: String, required: true },
    brand: { type: String, default: "" },
    line: { type: String, default: "" },
    facebook: { type: String, default: "" },
    tiktok: { type: String, default: "" },
    phone: { type: String },
    province: { type: String },
    provinceStrike: { type: Boolean, default: false },
    address: { type: String, default: "" },

    // CRM pipeline & assignment
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    section: { type: String, default: "s1" },
    previousSection: { type: String, default: "" },
    isReturningCustomer: { type: Boolean, default: false },
    // How many orders this customer has taken all the way through Final QC and
    // handover. Drives the stars on the Sales card, so a loyal buyer is visible
    // at a glance instead of looking like any other returning lead.
    completedOrderCount: { type: Number, default: 0 },
    // Ticked in the Sales list view once the salesperson has actually spoken to
    // this lead. Separate from the pipeline stage: a deal can sit in the same
    // column for weeks with or without the call having happened.
    isContacted: { type: Boolean, default: false },
    contactedAt: { type: Date, default: null },
    statusChangedAt: { type: Date, default: Date.now },
    assignee: { type: String },
    assigneeColor: { type: String },
    dueDate: { type: String },
    nextCallDate: { type: String },
    notes: { type: String },
    estValue: { type: mongoose.Schema.Types.Mixed, default: "" },
    payPct: { type: String, default: "" },
    paidAmount: { type: mongoose.Schema.Types.Mixed, default: "" },
    orderType: { type: String, default: "" }, // "lot" | "sample" | "develop"

    // Order line-items — typed (B1)
    orderedProducts: { type: [orderProductSchema], default: [] },

    // Cross-module links for the manufacturing chain
    formulaId: { type: mongoose.Schema.Types.ObjectId, ref: "BomFormula" },
    skuId: { type: mongoose.Schema.Types.ObjectId, ref: "ProductSku" },
    consumedPackaging: [
      {
        itemId: { type: mongoose.Schema.Types.ObjectId, ref: "PackagingItem" },
        name: { type: String, default: "" },
        qty: { type: Number, default: 0 }
      }
    ],
    producedLotId: { type: mongoose.Schema.Types.ObjectId, ref: "ProductLot" },

    // Order-level production/QC state (single-product legacy orders)
    productionStatus: { type: String, default: "ยังไม่ผลิต" },
    productionStep: { type: Number, default: 1 },
    qc1BulkPhoto: { type: String, default: "" },
    qc1EmptyPackPhoto: { type: String, default: "" },
    qc1PackagingPhoto: { type: String, default: "" },
    qc1PumpPhoto: { type: String, default: "" },
    qc1StickerPhoto: { type: String, default: "" },
    qc1AssembledVideo: { type: String, default: "" },
    qcPackagingPhoto: { type: String, default: "" },
    qcPumpPhoto: { type: String, default: "" },
    qcStickerPhoto: { type: String, default: "" },
    qcAssembledVideo: { type: String, default: "" },
    chatScreenshotProof: { type: String, default: "" },
    qcStatus: { type: String, default: "pending" },
    isStockDeducted: { type: Boolean, default: false },
    producedQty: { type: Number, default: 0 },
    queueOrder: { type: Number, default: 999 },
    packagingChecklist: { type: mongoose.Schema.Types.Mixed, default: null },
    packagingSubStep: { type: String, default: "filling" }, // "filling" | "labeling" | "lot" | "sealing"
    lotPosition: { type: String, default: "" },
    qcLotPhoto: { type: String, default: "" },
    qcSealingPhoto: { type: String, default: "" },
    qcFinalPhoto: { type: String, default: "" },
    lotStampNo: { type: String, default: "" },
    lotStampMfg: { type: String, default: "" },
    lotStampExp: { type: String, default: "" }
  },
  { timestamps: true }
);

// Accept legacy shapes on write as well — anything assigned to
// orderedProducts is normalized before validation/casting.
CustomerSchema.pre("validate", function (next) {
  if (this.orderedProducts !== undefined && !Array.isArray(this.orderedProducts)) {
    this.orderedProducts = normalizeOrderedProducts(this.orderedProducts);
  }
  next();
});

// ---------------------------------------------------------------------------
// QC media is stored as base64 data: URLs, so a single order can carry ~1.4 MB
// of photos inside its document. Any endpoint that returns a *list* must exclude
// these or it ships every photo of every order on each page load — that is what
// made GET /sales a 2.8 MB response off 10 documents.
//
// Screens that actually render QC media (Production, R&D) read a single order via
// GET /production/orders/:id, which is unprojected and still returns everything.
//
// Some of these live outside the schema (orderProductSchema is strict:false), so
// they are listed explicitly rather than derived from schema paths.
// ---------------------------------------------------------------------------
const QC_MEDIA_FIELDS = [
  "qc1BulkPhoto", "qc1EmptyPackPhoto", "qc1PackagingPhoto", "qc1PumpPhoto",
  "qc1StickerPhoto", "qc1AssembledVideo", "qcPackagingPhoto", "qcPumpPhoto",
  "qcStickerPhoto", "qcAssembledVideo", "qcLotPhoto", "qcSealingPhoto",
  "qcFinalPhoto", "chatScreenshotProof", "rndQcPhotos",
];

export const LIST_PROJECTION = QC_MEDIA_FIELDS
  .flatMap((f) => [`-${f}`, `-orderedProducts.${f}`])
  .join(" ");

export default mongoose.model("Customer", CustomerSchema);
