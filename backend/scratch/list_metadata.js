import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/erp_naive_innova";

const listMetadata = async () => {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db("ERP");

    // Get Admin user
    const adminUser = await db.collection("users").findOne({ roleName: "Admin" }); // Wait, let's check field names
    console.log("Admin user:", adminUser);
    
    // Find all roles
    const roles = await db.collection("roles").find({}).toArray();
    console.log("Roles:", roles);

    // List packaging types
    const pkgTypes = await db.collection("packagingtypes").find({}).toArray();
    console.log("Packaging Types:", pkgTypes);

    // Let's print one user doc to see the schema
    const userDoc = await db.collection("users").findOne({});
    console.log("Sample user:", userDoc);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
};

listMetadata();
