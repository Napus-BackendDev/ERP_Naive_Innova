import mongoose from "mongoose";

const ActivityLogSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    actionType: { type: String, required: true }, // e.g., 'PRODUCTION', 'PACKAGING', 'INGREDIENT', 'FORMULA', 'USER'
    description: { type: String, required: true },
    operator: { type: String, required: true }, // Name of user who performed it
    // Structured stock movement data. Kept optional so legacy audit rows remain
    // readable and can still use the description-based fallback in the UI.
    stockMovement: {
      itemType: {
        type: String,
        enum: ["ingredient", "packaging", "sampleProduct", "fgLot"]
      },
      itemId: { type: mongoose.Schema.Types.ObjectId },
      itemName: { type: String, default: "" },
      direction: { type: String, enum: ["in", "out"] },
      amount: { type: Number },
      unit: { type: String, default: "" },
      beforeQuantity: { type: Number },
      afterQuantity: { type: Number },
      source: { type: String, default: "" },
      stage: { type: String, default: "" },
      note: { type: String, default: "" },
      relatedOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      relatedOrderName: { type: String, default: "" },
      relatedLotId: { type: mongoose.Schema.Types.ObjectId, ref: "ProductLot" }
    }
  },
  { timestamps: true }
);

ActivityLogSchema.index({ ownerId: 1, createdAt: -1 });
ActivityLogSchema.index({
  ownerId: 1,
  "stockMovement.itemType": 1,
  "stockMovement.itemId": 1,
  createdAt: -1
});

export default mongoose.model("ActivityLog", ActivityLogSchema);
