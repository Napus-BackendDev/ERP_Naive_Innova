import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/erp_naive_innova";

const explore = async () => {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log("=== All Databases on Cluster ===\n");

    const admin = client.db().admin();
    const dbs = await admin.listDatabases();

    for (const dbInfo of dbs.databases) {
      console.log(`📁 ${dbInfo.name} (${(dbInfo.sizeOnDisk / 1024).toFixed(1)} KB)`);
      
      // Explore collections in each non-system DB
      if (!["admin", "local", "config"].includes(dbInfo.name)) {
        const db = client.db(dbInfo.name);
        const cols = await db.listCollections().toArray();
        for (const col of cols) {
          const count = await db.collection(col.name).countDocuments();
          console.log(`   📦 ${col.name}: ${count} docs`);
          
          // Show sample doc for packaging-related collections
          if (col.name.toLowerCase().includes("packag") || col.name.toLowerCase().includes("product") || col.name.toLowerCase().includes("item")) {
            const sample = await db.collection(col.name).findOne();
            if (sample) {
              console.log(`      Sample keys: ${Object.keys(sample).join(", ")}`);
            }
          }
        }
      }
      console.log();
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
};

explore();
