import { MongoClient, ObjectId } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/erp_naive_innova";

const checkOwner = async () => {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db("ERP");
    const owner = await db.collection("users").findOne({ _id: new ObjectId("6a47598e8dd4cf1d9db3d1e1") });
    console.log("Owner user of packaging types:", owner);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
};

checkOwner();
