import mongoose from "mongoose";

const RoleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, default: "" },
    permissions: [{ type: String }] // e.g. ["manage_users", "view_all_data", "edit_data"]
  },
  { timestamps: true }
);

export default mongoose.model("Role", RoleSchema);
