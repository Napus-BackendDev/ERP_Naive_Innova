import mongoose from "mongoose";

const PackagingSubTypeSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    parentType: { type: mongoose.Schema.Types.ObjectId, ref: "PackagingType", required: true }
  },
  { timestamps: true }
);

PackagingSubTypeSchema.index({ ownerId: 1, parentType: 1, name: 1 }, { unique: true });

export default mongoose.model("PackagingSubType", PackagingSubTypeSchema);
