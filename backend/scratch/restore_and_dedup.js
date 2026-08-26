import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/erp_naive_innova";

const restore = async () => {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const srcStock = client.db("stockManagerDB");
    const srcTest = client.db("test");
    const dest = client.db("ERP");

    // Collections that were over-deleted due to null keys
    const toRestore = ["transactions", "activitylogs", "salesleads", "productlots", "productskus"];

    for (const colName of toRestore) {
      // Drop the incorrectly cleaned collection
      await dest.collection(colName).deleteMany({});

      // Re-copy from stockManagerDB
      const stockDocs = await srcStock.collection(colName).find({}).toArray();
      if (stockDocs.length > 0) {
        await dest.collection(colName).insertMany(stockDocs);
        console.log(`✅ ${colName}: restored ${stockDocs.length} from stockManagerDB`);
      }

      // Merge unique from test (by _id)
      const testDocs = await srcTest.collection(colName).find({}).toArray();
      let added = 0;
      for (const doc of testDocs) {
        try {
          await dest.collection(colName).insertOne(doc);
          added++;
        } catch (err) {
          if (err.code === 11000) continue; // duplicate _id, skip
          throw err;
        }
      }
      if (added > 0) console.log(`  + ${colName}: merged ${added} unique from test`);
    }

    // Now remove TRUE duplicates for these collections using _id-based comparison
    // For salesleads: check by name+phone (not email which can be null)
    console.log("\n=== Re-checking for real duplicates ===");

    // salesleads: duplicate by name+phone combo
    const salesDups = await dest.collection("salesleads").aggregate([
      { $group: { _id: { name: "$name", phone: "$phone" }, count: { $sum: 1 }, ids: { $push: "$_id" } } },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();
    let salesRemoved = 0;
    for (const dup of salesDups) {
      const toRemove = dup.ids.slice(1);
      await dest.collection("salesleads").deleteMany({ _id: { $in: toRemove } });
      salesRemoved += toRemove.length;
    }
    console.log(`salesleads: removed ${salesRemoved} true duplicates`);

    // productlots: duplicate by _id is already handled, check by productId+lotNumber
    const lotDups = await dest.collection("productlots").aggregate([
      { $group: { _id: { productId: "$productId", lotNumber: "$lotNumber" }, count: { $sum: 1 }, ids: { $push: "$_id" } } },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();
    let lotsRemoved = 0;
    for (const dup of lotDups) {
      const toRemove = dup.ids.slice(1);
      await dest.collection("productlots").deleteMany({ _id: { $in: toRemove } });
      lotsRemoved += toRemove.length;
    }
    console.log(`productlots: removed ${lotsRemoved} true duplicates`);

    // productskus: duplicate by productId+size combo
    const skuDups = await dest.collection("productskus").aggregate([
      { $group: { _id: { productId: "$productId", size: "$size" }, count: { $sum: 1 }, ids: { $push: "$_id" } } },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();
    let skuRemoved = 0;
    for (const dup of skuDups) {
      const toRemove = dup.ids.slice(1);
      await dest.collection("productskus").deleteMany({ _id: { $in: toRemove } });
      skuRemoved += toRemove.length;
    }
    console.log(`productskus: removed ${skuRemoved} true duplicates`);

    // activitylogs: duplicate by description+createdAt
    const logDups = await dest.collection("activitylogs").aggregate([
      { $group: { _id: { description: "$description", createdAt: "$createdAt" }, count: { $sum: 1 }, ids: { $push: "$_id" } } },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();
    let logRemoved = 0;
    for (const dup of logDups) {
      const toRemove = dup.ids.slice(1);
      await dest.collection("activitylogs").deleteMany({ _id: { $in: toRemove } });
      logRemoved += toRemove.length;
    }
    console.log(`activitylogs: removed ${logRemoved} true duplicates`);

    // transactions: no natural key issues, just keep all unique by _id (already handled)
    console.log(`transactions: kept all unique by _id`);

    // Final count
    console.log("\n=== Final Verification ===");
    const allCols = await dest.listCollections().toArray();
    let total = 0;
    for (const c of allCols) {
      const cnt = await dest.collection(c.name).countDocuments();
      total += cnt;
      console.log(`  📦 ${c.name}: ${cnt}`);
    }
    console.log(`\n🎉 Done! Total: ${total} documents in ERP.`);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
};

restore();
