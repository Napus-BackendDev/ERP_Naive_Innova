import mongoose from "mongoose";
import dotenv from "dotenv";
import PackagingItem from "../src/features/packaging/packagingItem.model.js";
import ActivityLog from "../src/features/logs/activityLog.model.js";

dotenv.config();

const clearPackaging = async () => {
  try {
    console.log("Connecting to MongoDB URI:", process.env.MONGODB_URI);
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB.");

    const itemsDeleteResult = await PackagingItem.deleteMany({});
    console.log(`Deleted ${itemsDeleteResult.deletedCount} packaging items.`);

    const logsDeleteResult = await ActivityLog.deleteMany({ actionType: "PACKAGING" });
    console.log(`Deleted ${logsDeleteResult.deletedCount} activity logs of type PACKAGING.`);

  } catch (error) {
    console.error("Error clearing packaging data:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
};

clearPackaging();
