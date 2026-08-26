import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/features/users/user.model.js';
import PackagingType from '../src/features/packaging/packagingType.model.js';
import PackagingSubType from '../src/features/packaging/packagingSubType.model.js';
import PackagingItem from '../src/features/packaging/packagingItem.model.js';

dotenv.config();

const mainCategories = ["บรรจุภัณฑ์", "หัวฉีด", "ไปรษณีย์", "สติกเกอร์", "อื่นๆ"];

const subCategoriesData = {
  "บรรจุภัณฑ์": ["ขวดแชมพู", "ขวดแก้ว", "กระปุกครีม", "หลอดบีบ"],
  "หัวฉีด": ["หัวปั๊ม", "หัวสเปรย์", "ฝาเกลียว", "ฝาป๊อปอัพ"],
  "ไปรษณีย์": ["กล่องไปรษณีย์", "ซองกันกระแทก", "เทปกาว"],
  "สติกเกอร์": ["ฉลากสินค้า", "สติกเกอร์กันปลอม"],
  "อื่นๆ": ["ถุงมือ", "ฟิล์มหด"]
};

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/naive';
  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  // Find a user to assign as owner
  const user = await User.findOne({});
  if (!user) {
    console.error("No user found in the DB!");
    process.exit(1);
  }
  const ownerId = user._id;

  // 1. Wipe existing collections
  console.log("Clearing packaging items, subcategories, and types...");
  await PackagingItem.deleteMany({});
  await PackagingSubType.deleteMany({});
  await PackagingType.deleteMany({});
  console.log("Cleared all packaging collections.");

  // 2. Seed main categories and subcategories
  for (const mainName of mainCategories) {
    const parentType = new PackagingType({
      ownerId,
      name: mainName
    });
    await parentType.save();
    console.log(`Seeded Main Category: ${mainName} (${parentType._id})`);

    const subNames = subCategoriesData[mainName] || [];
    for (const subName of subNames) {
      const subType = new PackagingSubType({
        ownerId,
        name: subName,
        parentType: parentType._id
      });
      await subType.save();
      console.log(`  -> Seeded Sub Category: ${subName} (${subType._id})`);
    }
  }

  // 3. Seed some initial packaging items referencing new IDs
  console.log("Seeding initial packaging items...");
  const bType = await PackagingType.findOne({ name: "บรรจุภัณฑ์" });
  const bSub = await PackagingSubType.findOne({ name: "ขวดแชมพู", parentType: bType._id });

  const initialItems = [
    {
      ownerId,
      name: "ขวดแชมพู 100ml สีขาว",
      sku: "PKG-BTL-100",
      type: bType._id,
      subType: bSub._id,
      customer: "ระบบ",
      initialQuantity: 1200,
      currentQuantity: 1200,
      note: "ขวดแชมพูสีขาว"
    }
  ];

  await PackagingItem.create(initialItems);
  console.log("Seeded initial packaging items successfully.");

  console.log("All tasks completed!");
  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
