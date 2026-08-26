import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const GROUP = "production-no-formula-chemicals-v1";
const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ASSET_DIR = path.join(HERE, "public", "mock-production-assets");
const MOCK_FORMULA_NAME = "Mock สูตรสุ่ม QA - ไม่ใช่สูตรจริง";
const MOCK_INGREDIENTS = [
  { name: "Mock Aqua Base", gramsPerKg: 650, phase: "A" },
  { name: "Mock Humectant X", gramsPerKg: 120, phase: "A" },
  { name: "Mock Texture Agent Z", gramsPerKg: 100, phase: "B" },
  { name: "Mock Preservative Q", gramsPerKg: 20, phase: "C" },
  { name: "Mock Fragrance R", gramsPerKg: 10, phase: "C" },
  { name: "Mock Colorant M", gramsPerKg: 100, phase: "D" }
];

if (!uri) {
  console.error("MONGODB_URI or MONGO_URI is required");
  process.exitCode = 1;
}

const stages = [
  {
    code: "A",
    customer: "Mock Customer A",
    brand: "Demo Brand A",
    product: "สินค้าทดสอบ Production A",
    status: "รอยืนยัน",
    step: 2,
    quantity: 120,
    size: "100 ml"
  },
  {
    code: "B",
    customer: "Mock Customer B",
    brand: "Demo Brand B",
    product: "สินค้าทดสอบ Production B",
    status: "รอยืนยัน",
    step: 2,
    quantity: 240,
    size: "250 ml"
  },
  {
    code: "C",
    customer: "Mock Customer C",
    brand: "Demo Brand C",
    product: "สินค้าทดสอบ Production C",
    status: "รอยืนยัน",
    step: 2,
    quantity: 360,
    size: "500 ml"
  },
  {
    code: "D",
    customer: "Mock Customer D",
    brand: "Demo Brand D",
    product: "สินค้าทดสอบ Production D",
    status: "รอยืนยัน",
    step: 2,
    quantity: 180,
    size: "50 ml"
  },
  {
    code: "E",
    customer: "Mock Customer E",
    brand: "Demo Brand E",
    product: "สินค้าทดสอบ Production E",
    status: "รอยืนยัน",
    step: 2,
    quantity: 90,
    size: "30 ml"
  }
];

const daysAgo = (days) => new Date(Date.now() - days * 86400000);

function imageDataUrl(filename) {
  const file = path.join(ASSET_DIR, filename);
  if (!fs.existsSync(file)) {
    throw new Error(`ไม่พบไฟล์ภาพ ${file}`);
  }
  return `data:image/jpeg;base64,${fs.readFileSync(file).toString("base64")}`;
}

async function upsertMockCatalog(ownerId) {
  if (!ownerId) throw new Error("ไม่พบ owner สำหรับสร้าง catalog mock");

  const typeSpecs = [
    { key: "bottle", name: "Mock ขวด PET ใส" },
    { key: "nozzle", name: "Mock หัวปั๊มสีดำ" },
    { key: "sticker", name: "Mock สติกเกอร์ฉลากขาว" }
  ];
  const typeIds = {};
  const typeCollection = mongoose.connection.collection("packagingtypes");
  const itemCollection = mongoose.connection.collection("packagingitems");

  for (const spec of typeSpecs) {
    await typeCollection.updateOne(
      { ownerId, name: spec.name, __productionMock: GROUP },
      {
        $set: { name: spec.name, ownerId, __productionMock: GROUP, updatedAt: new Date() },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    );
    const type = await typeCollection.findOne({ ownerId, name: spec.name, __productionMock: GROUP });
    typeIds[spec.key] = type._id;
  }

  const itemSpecs = [
    {
      key: "bottle",
      name: "Mock ขวด PET ใส 30-500 ml",
      typeId: typeIds.bottle,
      image: imageDataUrl("mock-bottle.jpg"),
      note: "ภาพสินค้า mock แบบ photorealistic — ขวด"
    },
    {
      key: "nozzle",
      name: "Mock หัวปั๊มสีดำ",
      typeId: typeIds.nozzle,
      image: imageDataUrl("mock-nozzle.jpg"),
      note: "ภาพสินค้า mock แบบ photorealistic — หัวฉีด"
    },
    {
      key: "sticker",
      name: "Mock สติกเกอร์ฉลากขาว",
      typeId: typeIds.sticker,
      image: imageDataUrl("mock-sticker.jpg"),
      note: "ภาพสินค้า mock แบบ photorealistic — สติกเกอร์"
    }
  ];

  const catalog = {};
  for (const spec of itemSpecs) {
    await itemCollection.updateOne(
      { ownerId, name: spec.name, __productionMock: GROUP },
      {
        $set: {
          ownerId,
          name: spec.name,
          type: spec.typeId,
          customer: "ระบบ mock",
          currentQuantity: 2000,
          minStock: 0,
          image: spec.image,
          note: spec.note,
          __productionMock: GROUP,
          updatedAt: new Date()
        },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    );
    catalog[spec.key] = await itemCollection.findOne({ ownerId, name: spec.name, __productionMock: GROUP });
  }

  return catalog;
}

async function upsertMockChemicalData(ownerId) {
  if (!ownerId) throw new Error("ไม่พบ owner สำหรับสร้างสูตรเคมี mock");

  const now = new Date();
  const ingredientCollection = mongoose.connection.collection("ingredients");
  for (const ingredient of MOCK_INGREDIENTS) {
    await ingredientCollection.updateOne(
      { ownerId, name: ingredient.name, __productionMock: GROUP },
      {
        $set: {
          ownerId,
          name: ingredient.name,
          openingStock: 100000,
          supplier: "Mock QA",
          pricePerKg: 0,
          minStock: 0,
          image: "",
          __productionMock: GROUP,
          updatedAt: now
        },
        $setOnInsert: { createdAt: now }
      },
      { upsert: true }
    );
  }

  const bom = Object.fromEntries(MOCK_INGREDIENTS.map((ingredient) => [ingredient.name, ingredient.gramsPerKg]));
  const phases = Object.fromEntries(MOCK_INGREDIENTS.map((ingredient) => [ingredient.name, ingredient.phase]));
  const formulaCollection = mongoose.connection.collection("bomformulas");
  await formulaCollection.updateOne(
    { ownerId, name: MOCK_FORMULA_NAME, __productionMock: GROUP },
    {
      $set: {
        ownerId,
        name: MOCK_FORMULA_NAME,
        color: "#7C3AED",
        bom,
        phases,
        note: ["สูตรสุ่มสำหรับทดสอบหน้า Production เท่านั้น", "ห้ามนำไปผลิตจริง"],
        procedures: [
          "ผสม Mock Aqua Base กับ Mock Humectant X ในถังจำลอง",
          "เติม Mock Texture Agent Z แล้วกวนให้เข้ากัน",
          "เติม Mock Preservative Q, Mock Fragrance R และ Mock Colorant M",
          "พักตัวอย่างแล้วส่งตรวจ QC ตามขั้นตอนจำลอง"
        ],
        qcSpec: {
          ph: "5.5-6.5 (mock)",
          viscosity: "1,200-1,800 cP (mock)",
          appearance: "เนื้อเจลสีม่วงอ่อน (mock)",
          scent: "กลิ่นจำลอง QA",
          fillVolume: "ตามใบสั่งผลิต",
          note: "ข้อมูลทั้งหมดเป็น mockup ไม่ใช่ข้อกำหนดผลิตจริง"
        },
        qcChecklistItems: [],
        qcMethod: "ตรวจข้อมูลจำลองเท่านั้น",
        __productionMock: GROUP,
        updatedAt: now
      },
      $setOnInsert: { createdAt: now }
    },
    { upsert: true }
  );

  return formulaCollection.findOne({ ownerId, name: MOCK_FORMULA_NAME, __productionMock: GROUP });
}

function makeLine(stage, catalog, formula) {
  return {
    productName: stage.product,
    formulaName: formula.name,
    quantityPcs: stage.quantity,
    bottleCount: stage.quantity,
    bottleSize: stage.size,
    fillVolume: Number.parseInt(stage.size, 10),
    brand: stage.brand,
    customerFormulaType: "Mock สูตรทดสอบ",
    packagingType: catalog.bottle.name,
    packagingItemId: catalog.bottle._id,
    labelType: catalog.sticker.name,
    labelItemId: catalog.sticker._id,
    nozzleType: catalog.nozzle.name,
    nozzleId: catalog.nozzle._id,
    stickerOrderer: "ระบบ mock",
    stickerStatus: "พร้อมใช้งาน",
    scentType: "",
    productionStatus: stage.status,
    productionStep: stage.step,
    isConfirmed: true,
    isStockDeducted: false,
    consumedPackaging: [],
    scheduleMachineId: "",
    scheduleStartDate: "",
    scheduleEndDate: "",
    scheduleQueueNo: null,
    notes: "ข้อมูลจำลอง Production เท่านั้น ใช้สูตรและสาร mock ไม่ใช่สูตรจริง และไม่ตัดสต็อก"
  };
}

function makeCustomer(stage, index, ownerId, catalog, formula) {
  const createdAt = daysAgo(5 - index);
  const row = {
    email: `production.mock.${stage.code.toLowerCase()}@naiveops.local`,
    name: stage.customer,
    brand: stage.brand,
    section: "s11",
    orderType: "lot",
    notes: "Mock Production: ใช้สูตรและสารจำลอง ไม่ใช่สูตรจริง และไม่ตัดสต็อก",
    orderedProducts: [makeLine(stage, catalog, formula)],
    formulaId: formula._id,
    productionStatus: stage.status,
    productionStep: stage.step,
    isConfirmed: true,
    isStockDeducted: false,
    consumedPackaging: [],
    statusChangedAt: createdAt,
    createdAt,
    updatedAt: createdAt,
    __productionMock: GROUP
  };

  if (ownerId) row.ownerId = ownerId;
  return row;
}

async function connect() {
  if (!uri) return;
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
}

async function clean() {
  const customerResult = await mongoose.connection.collection("customers").deleteMany({
    __productionMock: GROUP
  });
  const itemResult = await mongoose.connection.collection("packagingitems").deleteMany({
    __productionMock: GROUP
  });
  const typeResult = await mongoose.connection.collection("packagingtypes").deleteMany({
    __productionMock: GROUP
  });
  const formulaResult = await mongoose.connection.collection("bomformulas").deleteMany({
    __productionMock: GROUP
  });
  const ingredientResult = await mongoose.connection.collection("ingredients").deleteMany({
    __productionMock: GROUP
  });
  console.log(`ลบ mock Production ${customerResult.deletedCount} รายการ, catalog ${itemResult.deletedCount} รายการ, type ${typeResult.deletedCount} รายการ, formula ${formulaResult.deletedCount} รายการ, ingredient ${ingredientResult.deletedCount} รายการ`);
}

async function seed() {
  await clean();

  const owner = await mongoose.connection.collection("users").findOne({}, { projection: { _id: 1 } });
  const catalog = await upsertMockCatalog(owner?._id);
  const formula = await upsertMockChemicalData(owner?._id);
  const rows = stages.map((stage, index) => makeCustomer(stage, index, owner?._id, catalog, formula));
  const result = await mongoose.connection.collection("customers").insertMany(rows);

  console.log(`สร้าง mock Production ${Object.keys(result.insertedIds).length} รายการ`);
  console.log(stages.map((stage) => `${stage.customer}: ${stage.status} (step ${stage.step})`).join("\n"));
  console.log(`แนบภาพ catalog: ขวด=${catalog.bottle.image ? "มี" : "ไม่มี"}, หัวฉีด=${catalog.nozzle.image ? "มี" : "ไม่มี"}, สติกเกอร์=${catalog.sticker.image ? "มี" : "ไม่มี"}`);
  console.log(`แนบสูตรเคมี mock: ${formula.name} (${MOCK_INGREDIENTS.length} รายการสารจำลอง)`);
  console.log("สูตรและสารทั้งหมดเป็น mockup ไม่ใช่สูตรผลิตจริง และยังไม่ตัดสต็อก");
}

async function status() {
  const rows = await mongoose.connection.collection("customers")
    .find({ __productionMock: GROUP }, { projection: { name: 1, productionStatus: 1, productionStep: 1, orderedProducts: 1 } })
    .sort({ name: 1 })
    .toArray();
  const catalog = await mongoose.connection.collection("packagingitems")
    .find({ __productionMock: GROUP }, { projection: { name: 1, image: 1 } })
    .sort({ name: 1 })
    .toArray();
  const formula = await mongoose.connection.collection("bomformulas")
    .findOne({ __productionMock: GROUP }, { projection: { name: 1, bom: 1, __productionMock: 1 } });
  console.log(JSON.stringify({
    orders: rows.map((row) => ({
      name: row.name,
      productionStatus: row.productionStatus,
      productionStep: row.productionStep,
      line: row.orderedProducts?.[0] ? {
        productName: row.orderedProducts[0].productName,
        bottle: Boolean(row.orderedProducts[0].packagingItemId),
        nozzle: Boolean(row.orderedProducts[0].nozzleId),
        sticker: Boolean(row.orderedProducts[0].labelItemId),
        formulaName: row.orderedProducts[0].formulaName || ""
      } : null
    })),
    catalog: catalog.map((item) => ({ name: item.name, hasImage: Boolean(item.image) })),
    formula: formula ? { name: formula.name, ingredients: Object.keys(formula.bom || {}).length } : null
  }, null, 2));
}

async function main() {
  if (!uri) return;
  await connect();

  const mode = process.argv[2] || "seed";
  if (mode === "seed") await seed();
  else if (mode === "clean") await clean();
  else if (mode === "status") await status();
  else {
    console.error("ใช้: node seed_production_mock.js seed|clean|status");
    process.exitCode = 1;
  }
}

try {
  await main();
} catch (error) {
  console.error(`ทำงานไม่สำเร็จ: ${error.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
