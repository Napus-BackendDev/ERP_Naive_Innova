import mongoose from "mongoose";

const IngredientSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    openingStock: { type: Number, required: true, default: 0 },
    supplier: { type: String },
    pricePerKg: { type: Number, default: 0 },
    // Reorder point in grams. The Cockpit shortage panel used one flat 5,000 g rule
    // for every chemical, which flagged 65 of 88 items — a warning on almost
    // everything. 0 = not set, fall back to that flat rule.
    minStock: { type: Number, default: 0 },
    image: { type: String },
  },
  { timestamps: true }
);

// Create compound index for row isolation and queries
IngredientSchema.index({ ownerId: 1, name: 1 });

export default mongoose.model("Ingredient", IngredientSchema);
