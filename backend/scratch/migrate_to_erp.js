import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/erp_naive_innova";

const migrate = async () => {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log("Connected successfully to MongoDB cluster\n");

    const srcDbStock = client.db("stockManagerDB");
    const srcDbTest = client.db("test");
    const destDbErp = client.db("ERP");

    // Drop entire ERP database to start completely fresh
    console.log("Dropping existing ERP database...");
    await destDbErp.dropDatabase();
    console.log("ERP database dropped.\n");

    // 1. Copy ALL collections from stockManagerDB first (primary source)
    console.log("=== Phase 1: Copying from stockManagerDB ===");
    const stockCols = await srcDbStock.listCollections().toArray();
    for (const col of stockCols) {
      const colName = col.name;
      const docs = await srcDbStock.collection(colName).find({}).toArray();
      if (docs.length > 0) {
        await destDbErp.collection(colName).insertMany(docs);
        console.log(`  ✅ ${colName}: ${docs.length} documents copied`);
      } else {
        console.log(`  ⬜ ${colName}: empty (skipped)`);
      }
    }

    // 2. Copy from test database (secondary source - merge unique documents only)
    console.log("\n=== Phase 2: Merging from test database ===");
    const testCols = await srcDbTest.listCollections().toArray();
    for (const col of testCols) {
      const colName = col.name;
      const docs = await srcDbTest.collection(colName).find({}).toArray();
      if (docs.length === 0) {
        console.log(`  ⬜ ${colName}: empty (skipped)`);
        continue;
      }

      let insertedCount = 0;
      let skippedCount = 0;

      for (const doc of docs) {
        try {
          // Try to insert; if duplicate _id or unique index conflict, skip
          await destDbErp.collection(colName).insertOne(doc);
          insertedCount++;
        } catch (err) {
          if (err.code === 11000) {
            // Duplicate key - skip silently
            skippedCount++;
          } else {
            console.error(`  ❌ Error inserting into ${colName}:`, err.message);
          }
        }
      }
      console.log(`  ✅ ${colName}: +${insertedCount} new, ${skippedCount} duplicates skipped`);
    }

    // 3. Verify final counts
    console.log("\n=== Phase 3: Verification ===");
    const erpCols = await destDbErp.listCollections().toArray();
    let totalDocs = 0;
    for (const col of erpCols) {
      const count = await destDbErp.collection(col.name).countDocuments();
      totalDocs += count;
      console.log(`  📦 ERP.${col.name}: ${count} documents`);
    }
    console.log(`\n🎉 Migration completed! Total: ${erpCols.length} collections, ${totalDocs} documents in ERP database.`);

  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.close();
  }
};

migrate();
