import mongoose from "mongoose";

const MachineQueueEntrySchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    addedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const MachineSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    color: { type: String, default: "" },
    // Display order in the production lineup board
    order: { type: Number, default: 0 },
    // Optional machine image URL (maps to client "image" field)
    image: { type: String, default: "" },
    // Formula gating (maps 1:1 to client machine shape)
    allowedFormulas: { type: [String], default: [] },
    disallowedFormulas: { type: [String], default: [] },
    // Ordered queue of production orders (User docs) assigned to this machine
    queue: { type: [MachineQueueEntrySchema], default: [] }
  },
  { timestamps: true }
);

MachineSchema.index({ ownerId: 1 });

export default mongoose.model("Machine", MachineSchema);
