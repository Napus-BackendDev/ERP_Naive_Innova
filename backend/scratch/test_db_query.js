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
    console.log("Role 'ลูกค้า' ID:", role._id);

    const count = await User.countDocuments({ role: role._id });
    console.log("Count of users with role 'ลูกค้า':", count);

    const leads = await User.find({ role: role._id }).limit(3);
    console.log("Leads sample:", leads.map(l => ({ _id: l._id, name: l.name, email: l.email })));

  } catch (err) {
    console.error("Test failed:", err);
  } finally {
    await mongoose.disconnect();
  }
};

testDb();
