import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./src/features/users/user.model.js";

dotenv.config();

const resetCustomer = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB.");

    const updated = await User.findOneAndUpdate(
      { name: "ทดสอบ" },
      { 
        $set: { 
          productionStatus: "กำลังผลิต",
          qaPackagingPhoto: null,
          qaPumpPhoto: null,
          qaStickerPhoto: null,
          qaAssembledVideo: null
        } 
      },
      { new: true }
    );

    if (updated) {
      console.log(`Successfully reset customer '${updated.name}' to 'กำลังผลิต' status.`);
    } else {
      console.log("Customer 'ทดสอบ' not found.");
    }
  } catch (error) {
    console.error("Error resetting customer:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
};

resetCustomer();
