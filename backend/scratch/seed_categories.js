import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/features/users/user.model.js';
import PackagingType from '../src/features/packaging/packagingType.model.js';

dotenv.config();

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/naive';
  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  // Find an admin or any user to assign as owner
  const user = await User.findOne({});
  if (!user) {
    console.error("No user found in the DB!");
    process.exit(1);
  }

  const ownerId = user._id;
  const categories = ["บรรจุภัณฑ์", "หัวปั๊ม", "ไปรษณีย์", "อื่นๆ"];

  for (const name of categories) {
    let pType = await PackagingType.findOne({ ownerId, name });
    if (!pType) {
      pType = new PackagingType({ ownerId, name });
      await pType.save();
      console.log(`Created category: ${name}`);
    } else {
      console.log(`Category already exists: ${name}`);
    }
  }

  console.log("Categories seeded successfully!");
  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
