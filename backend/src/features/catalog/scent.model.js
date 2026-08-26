import mongoose from "mongoose";

const ScentSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true }
  },
  { timestamps: true }
);

ScentSchema.index({ ownerId: 1, name: 1 }, { unique: true });

export default mongoose.model("Scent", ScentSchema);
