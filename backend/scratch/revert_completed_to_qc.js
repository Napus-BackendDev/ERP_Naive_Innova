import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../src/features/users/user.model.js";

dotenv.config();

const revertToQc = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB.");

    const names = ["โรงพยาบาลสัตว์พิจิตร", "ทดสอบ"];
    for (const name of names) {
      const updated = await User.findOneAndUpdate(
        { name: name },
        { 
          $set: { 
            productionStatus: "รอตรวจ QA รอบที่ 2",
            productionStep: 5
          } 
        },
        { new: true }
      );

      if (updated) {
        console.log(`Successfully reverted customer '${updated.name}' to 'รอตรวจ QA รอบที่ 2' (Step 5).`);
      } else {
        console.log(`Customer '${name}' not found.`);
      }
    }
  } catch (error) {
    console.error("Error reverting customers:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
};

revertToQc();
