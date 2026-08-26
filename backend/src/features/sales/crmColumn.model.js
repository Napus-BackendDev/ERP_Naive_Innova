import mongoose from "mongoose";

const CrmColumnSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    label: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
    color: { type: String, default: "#3b82f6" },
    rule: {
      enabled: { type: Boolean, default: false },
      triggerDays: { type: Number, default: 7 },
      targetColumnId: { type: String, default: "" }
    },
    order: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export default mongoose.model("CrmColumn", CrmColumnSchema);
