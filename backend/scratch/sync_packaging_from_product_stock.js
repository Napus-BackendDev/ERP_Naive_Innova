import { MongoClient, ObjectId } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/erp_naive_innova";

const syncPackaging = async () => {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log("Connected successfully to MongoDB cluster\n");

    const srcDb = client.db("ProductStock");
    const destDb = client.db("ERP");

    const mockAdminId = new ObjectId("6a47598e8dd4cf1d9db3d1e1");

    // Fetch all items from ProductStock.items
    const stockItems = await srcDb.collection("items").find({}).toArray();
    console.log(`Fetched ${stockItems.length} items from ProductStock.items`);

    // Fetch all current packaging types from ERP
    const currentTypes = await destDb.collection("packagingtypes").find({}).toArray();
    const typeMap = new Map(currentTypes.map(t => [t.name, t._id]));

    let newTypesCount = 0;
    let newItemsCount = 0;
    let updatedItemsCount = 0;

    for (const item of stockItems) {
      // 1. Resolve or create Packaging Type in ERP
      const typeName = item.type ? item.type.trim() : "อื่นๆ";
      let typeId = typeMap.get(typeName);

      if (!typeId) {
        // Create new Packaging Type in ERP
        const newType = {
          _id: new ObjectId(),
          ownerId: mockAdminId,
          name: typeName,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        await destDb.collection("packagingtypes").insertOne(newType);
        typeId = newType._id;
        typeMap.set(typeName, typeId);
        newTypesCount++;
        console.log(`➕ Created new Packaging Type in ERP: "${typeName}"`);
      }

      // 2. Check if item already exists in ERP.packagingitems
      const itemName = item.name ? item.name.trim() : "";
      if (!itemName) continue;

      const existingItem = await destDb.collection("packagingitems").findOne({ name: itemName });

      if (existingItem) {
        // Update existing item in ERP
        await destDb.collection("packagingitems").updateOne(
          { _id: existingItem._id },
          {
            $set: {
              currentQuantity: item.qty || 0,
              customer: item.cust || "ระบบ",
              note: item.note || "",
              image: item.img || null,
              type: typeId,
              updatedAt: new Date()
            }
          }
        );
        updatedItemsCount++;
      } else {
        // Insert new item in ERP
        const newItem = {
          _id: new ObjectId(),
          ownerId: mockAdminId,
          name: itemName,
          type: typeId,
          customer: item.cust || "ระบบ",
          initialQuantity: item.qty || 0,
          currentQuantity: item.qty || 0,
          image: item.img || null,
          note: item.note || "",
          createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
          updatedAt: new Date()
        };
        await destDb.collection("packagingitems").insertOne(newItem);
        newItemsCount++;
      }
    }

    console.log("\n=== Synchronization Results ===");
    console.log(`📦 Packaging Types Created: ${newTypesCount}`);
    console.log(`📦 Packaging Items Created: ${newItemsCount}`);
    console.log(`📦 Packaging Items Updated: ${updatedItemsCount}`);

    // Verify final counts
    const finalTypesCount = await destDb.collection("packagingtypes").countDocuments();
    const finalItemsCount = await destDb.collection("packagingitems").countDocuments();
    console.log(`\nFinal counts in ERP DB:`);
    console.log(`  - Packaging Types: ${finalTypesCount}`);
    console.log(`  - Packaging Items: ${finalItemsCount}`);

  } catch (err) {
    console.error("Error during synchronization:", err);
  } finally {
    await client.close();
  }
};

syncPackaging();
