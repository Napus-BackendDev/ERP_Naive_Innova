import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const PRODUCTION_GROUP = "production-no-formula-chemicals-v1";
const RND_GROUP = "rnd-received-mock-v1";
const LEGACY_FORMULAS = [
  "เซรั่มสูตรพิเศษจำลอง (Mock Formula)",
  "สูตรทดสอบพรีเมียม (Mock)"
];

const MOCK_NAME_RE = /^Mock(?:\s|$)/i;
const MOCK_FORMULA_RE = /^Mock(?:\s|$)/i;
const MOCK_SUPPLIER_RE = /^Mock(?:\s|$)/i;

const taggedProduction = { __productionMock: PRODUCTION_GROUP };
const taggedRnd = { __rndMock: RND_GROUP };
const mockCustomerFilter = {
  $or: [taggedProduction, taggedRnd, { name: MOCK_NAME_RE }]
};
const mockFormulaFilter = {
  $or: [taggedProduction, taggedRnd, { name: MOCK_FORMULA_RE }, ...LEGACY_FORMULAS.map((name) => ({ name }))]
};
const mockIngredientFilter = {
  $or: [taggedProduction, taggedRnd, { name: MOCK_NAME_RE }, { supplier: MOCK_SUPPLIER_RE }]
};
const mockPackagingFilter = {
  $or: [taggedProduction, { name: MOCK_NAME_RE }, { note: /mock/i }]
};
const mockProductFilter = {
  $or: [{ name: MOCK_NAME_RE }, { formulaName: MOCK_FORMULA_RE }]
};
const mockLotFilter = {
  $or: [{ customer: MOCK_NAME_RE }, { formulaName: MOCK_FORMULA_RE }, ...LEGACY_FORMULAS.map((formulaName) => ({ formulaName }))]
};
const mockLineFilter = {
  "orderedProducts.formulaName": {
    $in: LEGACY_FORMULAS
  }
};

async function count(collection, filter) {
  return mongoose.connection.db.collection(collection).countDocuments(filter);
}

async function preview() {
  const collections = [
    ["customers", mockCustomerFilter],
    ["bomformulas", mockFormulaFilter],
    ["ingredients", mockIngredientFilter],
    ["packagingitems", mockPackagingFilter],
    ["packagingtypes", mockPackagingFilter],
    ["products", mockProductFilter],
    ["productskus", mockProductFilter],
    ["productlots", mockLotFilter],
    ["customers_with_legacy_mock_lines", mockLineFilter]
  ];
  const output = {};
  for (const [collection, filter] of collections) {
    output[collection] = collection === "customers_with_legacy_mock_lines"
      ? await count("customers", filter)
      : await count(collection, filter);
  }
  return output;
}

async function clean() {
  const db = mongoose.connection.db;

  const [customers, formulas, ingredients, packagingItems, packagingTypes, products, productSkus, productLots] = await Promise.all([
    db.collection("customers").find(mockCustomerFilter).project({ _id: 1 }).toArray(),
    db.collection("bomformulas").find(mockFormulaFilter).project({ _id: 1, name: 1 }).toArray(),
    db.collection("ingredients").find(mockIngredientFilter).project({ _id: 1 }).toArray(),
    db.collection("packagingitems").find(mockPackagingFilter).project({ _id: 1 }).toArray(),
    db.collection("packagingtypes").find(mockPackagingFilter).project({ _id: 1 }).toArray(),
    db.collection("products").find(mockProductFilter).project({ _id: 1 }).toArray(),
    db.collection("productskus").find(mockProductFilter).project({ _id: 1 }).toArray(),
    db.collection("productlots").find(mockLotFilter).project({ _id: 1 }).toArray()
  ]);

  const customerIds = customers.map((doc) => doc._id);
  const formulaIds = formulas.map((doc) => doc._id);
  const ingredientIds = ingredients.map((doc) => doc._id);
  const packagingItemIds = packagingItems.map((doc) => doc._id);
  const packagingTypeIds = packagingTypes.map((doc) => doc._id);
  const productIds = products.map((doc) => doc._id);
  const productSkuIds = productSkus.map((doc) => doc._id);
  const productLotIds = productLots.map((doc) => doc._id);

  // Remove legacy mock formula lines from any otherwise-real customer instead of
  // deleting the whole CRM record. Current seeded mock customers are deleted below.
  const legacyLineDocs = await db.collection("customers").find(mockLineFilter).project({ _id: 1, name: 1, orderedProducts: 1 }).toArray();
  let changedRealCustomers = 0;
  for (const customer of legacyLineDocs) {
    if (customerIds.some((id) => String(id) === String(customer._id))) continue;
    const nextProducts = (customer.orderedProducts || []).filter((item) => !LEGACY_FORMULAS.includes(item?.formulaName));
    if (nextProducts.length !== (customer.orderedProducts || []).length) {
      await db.collection("customers").updateOne(
        { _id: customer._id },
        { $set: { orderedProducts: nextProducts }, $unset: { formulaId: "" } }
      );
      changedRealCustomers += 1;
    }
  }

  const deleteResults = {};
  deleteResults.customers = await db.collection("customers").deleteMany(mockCustomerFilter);
  deleteResults.bomformulas = await db.collection("bomformulas").deleteMany(mockFormulaFilter);
  deleteResults.ingredients = await db.collection("ingredients").deleteMany(mockIngredientFilter);
  deleteResults.packagingitems = await db.collection("packagingitems").deleteMany(mockPackagingFilter);
  deleteResults.packagingtypes = await db.collection("packagingtypes").deleteMany(mockPackagingFilter);
  deleteResults.products = await db.collection("products").deleteMany(mockProductFilter);
  deleteResults.productskus = await db.collection("productskus").deleteMany(mockProductFilter);
  deleteResults.productlots = await db.collection("productlots").deleteMany({
    $or: [
      mockLotFilter,
      ...(customerIds.length ? [{ orderId: { $in: customerIds } }] : []),
      ...(formulaIds.length ? [{ productId: { $in: formulaIds } }] : [])
    ]
  });

  // Remove mock-only activity history and customer-log rows tied to deleted orders.
  for (const collection of ["activitylogs", "customerlogs"]) {
    const exists = await db.listCollections({ name: collection }).hasNext();
    if (!exists) continue;
    const clauses = [];
    if (customerIds.length) {
      clauses.push({ customerId: { $in: customerIds } }, { orderId: { $in: customerIds } });
    }
    clauses.push({ description: /mock/i }, { formulaName: MOCK_FORMULA_RE });
    deleteResults[collection] = await db.collection(collection).deleteMany({ $or: clauses });
  }

  // Clear dangling mock references from any remaining real order lines.
  if (packagingItemIds.length || packagingTypeIds.length || ingredientIds.length || productLotIds.length) {
    const remaining = await db.collection("customers").find({}).project({ _id: 1, orderedProducts: 1, consumedPackaging: 1 }).toArray();
    let cleanedReferences = 0;
    for (const customer of remaining) {
      let changed = false;
      const orderedProducts = (customer.orderedProducts || []).map((item) => {
        const next = { ...item };
        for (const key of ["packagingItemId", "labelItemId", "nozzleId"]) {
          if (packagingItemIds.some((id) => String(id) === String(next[key]))) {
            delete next[key];
            changed = true;
          }
        }
        if (typeof next.packagingType === "string" && MOCK_NAME_RE.test(next.packagingType)) { delete next.packagingType; changed = true; }
        if (typeof next.labelType === "string" && MOCK_NAME_RE.test(next.labelType)) { delete next.labelType; changed = true; }
        if (typeof next.nozzleType === "string" && MOCK_NAME_RE.test(next.nozzleType)) { delete next.nozzleType; changed = true; }
        if (formulaIds.some((id) => String(id) === String(next.formulaId))) { delete next.formulaId; changed = true; }
        return next;
      });
      const consumedPackaging = (customer.consumedPackaging || []).filter((item) => {
        const remove = packagingItemIds.some((id) => String(id) === String(item?.itemId));
        if (remove) changed = true;
        return !remove;
      });
      if (changed) {
        await db.collection("customers").updateOne({ _id: customer._id }, { $set: { orderedProducts, consumedPackaging } });
        cleanedReferences += 1;
      }
    }
    deleteResults.cleaned_customer_references = { modifiedCount: cleanedReferences };
  }

  deleteResults.changed_real_customers = { modifiedCount: changedRealCustomers };
  return deleteResults;
}

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error("MONGODB_URI หรือ MONGO_URI ไม่ถูกตั้งค่า");
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });

  const before = await preview();
  console.log("ก่อนลบ:", JSON.stringify(before, null, 2));
  if (process.argv[2] !== "--apply") {
    console.log("DRY RUN: ยังไม่ได้ลบข้อมูล; ใช้ --apply เมื่อต้องการลบ");
    return;
  }

  const deleted = await clean();
  const after = await preview();
  console.log("ผลการลบ:", JSON.stringify(deleted, null, 2));
  console.log("หลังลบ:", JSON.stringify(after, null, 2));
}

main().catch((error) => {
  console.error("clean mock data error:", error.message);
  process.exitCode = 1;
}).finally(async () => {
  await mongoose.disconnect();
});
