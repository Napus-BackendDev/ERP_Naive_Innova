import mongoose from "mongoose";

const NozzleSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    image: { type: String }, // Base64 or URL (parallels PackagingItem.image)
    currentQuantity: { type: Number, default: 0 }
  },
  { timestamps: true }
);

NozzleSchema.index({ ownerId: 1, name: 1 }, { unique: true });

export default mongoose.model("Nozzle", NozzleSchema);
