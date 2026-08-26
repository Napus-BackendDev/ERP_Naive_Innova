import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/erp_naive_innova";

const checkDuplicates = async () => {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db("ERP");
    const collections = await db.listCollections().toArray();

    console.log("=== ERP Database Duplicate Check ===\n");

    for (const col of collections) {
      const colName = col.name;
      const collection = db.collection(colName);
      const totalCount = await collection.countDocuments();

      // Define duplicate detection key per collection
      let groupKey = null;
      switch (colName) {
        case "users":
          groupKey = "$email";
          break;
        case "roles":
          groupKey = "$name";
          break;
        case "ingredients":
          groupKey = "$name";
          break;
        case "packagingitems":
          groupKey = "$name";
          break;
        case "packagingtypes":
          groupKey = "$name";
          break;
        case "productskus":
          groupKey = "$sku";
          break;
        case "products":
          groupKey = "$name";
          break;
        case "productlots":
          groupKey = "$lotNumber";
          break;
        case "bomformulas":
          groupKey = "$name";
          break;
        case "salesleads":
          groupKey = "$email";
          break;
        case "activitylogs":
          // For logs, check by exact combination
          groupKey = { action: "$action", timestamp: "$timestamp", user: "$user" };
          break;
        case "transactions":
          groupKey = { itemId: "$itemId", date: "$date", type: "$type", quantity: "$quantity" };
          break;
        default:
          console.log(`📦 ${colName}: ${totalCount} docs (no duplicate key defined, skipping)`);
          continue;
      }

      // Find duplicates using aggregation
      const pipeline = [
        { $group: { _id: groupKey, count: { $sum: 1 }, ids: { $push: "$_id" } } },
        { $match: { count: { $gt: 1 } } },
        { $sort: { count: -1 } }
      ];

      const duplicates = await collection.aggregate(pipeline).toArray();

      if (duplicates.length === 0) {
        console.log(`✅ ${colName}: ${totalCount} docs — ไม่มีข้อมูลซ้ำ`);
      } else {
        let totalDupsToRemove = 0;
        const idsToRemove = [];

        for (const dup of duplicates) {
          const extraIds = dup.ids.slice(1); // keep first, remove rest
          idsToRemove.push(...extraIds);
          totalDupsToRemove += extraIds.length;
        }

        console.log(`⚠️  ${colName}: ${totalCount} docs — พบ ${duplicates.length} กลุ่มซ้ำ (${totalDupsToRemove} รายการที่จะลบ)`);
        
        for (const dup of duplicates.slice(0, 5)) {
          const keyLabel = typeof dup._id === "object" ? JSON.stringify(dup._id) : dup._id;
          console.log(`    → "${keyLabel}" ซ้ำ ${dup.count} ครั้ง`);
        }
        if (duplicates.length > 5) {
          console.log(`    → ... และอีก ${duplicates.length - 5} กลุ่ม`);
        }

        // Remove duplicates
        if (idsToRemove.length > 0) {
          const result = await collection.deleteMany({ _id: { $in: idsToRemove } });
          console.log(`    🗑️  ลบแล้ว ${result.deletedCount} รายการ`);
        }
      }
    }

    // Final verification
    console.log("\n=== Final Count After Cleanup ===");
    let totalDocs = 0;
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      totalDocs += count;
      console.log(`  📦 ${col.name}: ${count}`);
    }
    console.log(`\n🎉 Cleanup complete! Total: ${totalDocs} documents remaining.`);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
};

checkDuplicates();
