import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../src/features/users/user.model.js";
import Role from "../src/features/users/role.model.js";

dotenv.config();

const testDb = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const role = await Role.findOne({ name: "ลูกค้า" });
    console.log("Role 'ลูกค้า':", role);

    const testEmail = `lead.${Date.now()}.${Math.round(Math.random() * 100)}@naiveops.com`;
    const customerUser = new User({
      googleId: `lead-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      email: testEmail,
      name: "เทสระบบสร้างดีล",
      role: role._id,
      phone: "0123456789",
      notes: "เทสหมายเหตุ",
      estValue: 10000,
      section: "s1"
    });

    await customerUser.save();
    console.log("Successfully created customer user:", customerUser);

    // Now try to delete it
    await User.findByIdAndDelete(customerUser._id);
    console.log("Successfully deleted customer user");

  } catch (err) {
    console.error("Test failed with error:", err);
  } finally {
    await mongoose.disconnect();
  }
};

testDb();
