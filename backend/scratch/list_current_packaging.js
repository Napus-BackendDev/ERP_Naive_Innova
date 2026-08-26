import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/erp_naive_innova";

const listCurrentPackaging = async () => {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db("ERP");
    const items = await db.collection("packagingitems").find({}).toArray();
    console.log("=== Current Packaging Items in ERP ===");
    console.log(items.map(i => ({ name: i.name, currentQuantity: i.currentQuantity, type: i.type, customer: i.customer })));
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
};

listCurrentPackaging();
