import mongoose from "mongoose";
import dotenv from "dotenv";
import CrmColumn from "./src/features/sales/crmColumn.model.js";

dotenv.config();

const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/stockManagerDB";
console.log("Connecting to MongoDB at:", mongoUri);

async function run() {
  try {
    await mongoose.connect(mongoUri);
    console.log("Connected successfully!");

    const columnsPayload = [
      { id: "s1", label: "Lead", isDefault: true, order: 0 },
      { id: "s2", label: "Sample Sent", isDefault: true, order: 1 },
      { id: "s6", label: "Follow-up", isDefault: true, order: 2 },
      { id: "s10", label: "Negotiation", isDefault: true, order: 3 },
      { id: "s11", label: "Closed Won", isDefault: true, order: 4 }
    ];

    console.log("Deleting columns...");
    await CrmColumn.deleteMany({});
    console.log("Deleted. Now inserting...");

    const colsToInsert = columnsPayload.map((col, index) => ({
      id: col.id,
      label: col.label,
      isDefault: col.isDefault || false,
      rule: col.rule || { enabled: false, triggerDays: 7, targetColumnId: "" },
      order: index
    }));

    const saved = await CrmColumn.insertMany(colsToInsert);
    console.log("Successfully inserted:", saved.length, "columns!");
  } catch (err) {
    console.error("ERROR DETECTED:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected.");
  }
}

run();
