import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/erp_naive_innova";

const inspectItems = async () => {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db("ProductStock");
    const docs = await db.collection("items").find({}).limit(10).toArray();
    console.log("=== ProductStock.items sample docs ===");
    console.log(JSON.stringify(docs, null, 2));

    const distinctTypes = await db.collection("items").distinct("type");
    console.log("\nDistinct types in ProductStock.items:", distinctTypes);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
};

inspectItems();
