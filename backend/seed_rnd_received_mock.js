import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const GROUP = "rnd-received-mock-v1";
const MOCK_FORMULA_PREFIX = "Mock R&D สูตร";

const CustomerSchema = new mongoose.Schema({}, { strict: false, collection: "customers" });
const Customer = mongoose.model("RndMockCustomer", CustomerSchema);

const BomFormulaSchema = new mongoose.Schema({}, { strict: false, collection: "bomformulas" });
const BomFormula = mongoose.model("RndMockBomFormula", BomFormulaSchema);

const IngredientSchema = new mongoose.Schema({}, { strict: false, collection: "ingredients" });
const Ingredient = mongoose.model("RndMockIngredient", IngredientSchema);

const MOCK_INGREDIENTS = [
  "Mock R&D Aqua Base",
  "Mock R&D Humectant",
  "Mock R&D Texture Agent",
  "Mock R&D Active Blend",
  "Mock R&D Stabilizer",
  "Mock R&D Preservative",
  "Mock R&D Fragrance",
  "Mock R&D Colorant"
];

const FORMULA_GROUPS = [
  {
    type: "ผลิตตามสูตรโรงงาน",
    code: "โรงงาน",
    color: "#16A34A",
    recipes: [
      [690, 110, 80, 40, 30, 20, 15, 15],
      [650, 120, 90, 55, 30, 20, 20, 15]
    ]
  },
  {
    type: "ปรับสูตร",
    code: "ปรับ",
    color: "#D97706",
    recipes: [
      [620, 145, 95, 55, 30, 20, 20, 15],
      [600, 150, 105, 60, 35, 20, 15, 15]
    ]
  },
  {
    type: "พัฒนาสูตร",
    code: "พัฒนา",
    color: "#9333EA",
    recipes: [
      [560, 170, 110, 70, 35, 20, 20, 15],
      [520, 190, 120, 75, 35, 20, 20, 20]
    ]
  }
];

const MOCK_CUSTOMERS = [
  { typeIndex: 0, index: 0, name: "Mock R&D โรงงาน A", brand: "MOCK FACTORY BRAND A", quantityPcs: 120, fillVolume: 100 },
  { typeIndex: 0, index: 1, name: "Mock R&D โรงงาน B", brand: "MOCK FACTORY BRAND B", quantityPcs: 180, fillVolume: 250 },
  { typeIndex: 1, index: 0, name: "Mock R&D ปรับสูตร A", brand: "MOCK ADJUST BRAND A", quantityPcs: 90, fillVolume: 50 },
  { typeIndex: 1, index: 1, name: "Mock R&D ปรับสูตร B", brand: "MOCK ADJUST BRAND B", quantityPcs: 240, fillVolume: 30 },
  { typeIndex: 2, index: 0, name: "Mock R&D พัฒนาสูตร A", brand: "MOCK DEVELOP BRAND A", quantityPcs: 60, fillVolume: 100 },
  { typeIndex: 2, index: 1, name: "Mock R&D พัฒนาสูตร B", brand: "MOCK DEVELOP BRAND B", quantityPcs: 75, fillVolume: 250 }
];

function formulaName(typeIndex, index) {
  return `${MOCK_FORMULA_PREFIX} ${FORMULA_GROUPS[typeIndex].code} ${index === 0 ? "A" : "B"} - ไม่ใช่สูตรจริง`;
}

function recipeToBom(recipe) {
  return Object.fromEntries(MOCK_INGREDIENTS.map((name, index) => [name, recipe[index]]));
}

function recipeToPhases() {
  return Object.fromEntries(MOCK_INGREDIENTS.map((name, index) => [name, index < 3 ? "A" : index < 5 ? "B" : "C"]));
}

async function connect() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error("MONGODB_URI หรือ MONGO_URI ไม่ถูกตั้งค่าใน backend/.env");
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
}

async function getOwner() {
  const users = mongoose.connection.db.collection("users");
  const owner = await users.findOne({});
  if (!owner?._id) throw new Error("ไม่พบผู้ใช้สำหรับ ownerId");
  return owner;
}

async function clean() {
  const [customers, formulas, ingredients] = await Promise.all([
    Customer.deleteMany({ __rndMock: GROUP }),
    BomFormula.deleteMany({ __rndMock: GROUP }),
    Ingredient.deleteMany({ __rndMock: GROUP })
  ]);
  console.log(`ลบ R&D mock เดิม: ลูกค้า ${customers.deletedCount}, สูตร ${formulas.deletedCount}, สาร ${ingredients.deletedCount}`);
}

async function upsertIngredients(ownerId) {
  const docs = [];
  for (const name of MOCK_INGREDIENTS) {
    docs.push(await Ingredient.findOneAndUpdate(
      { ownerId, name, __rndMock: GROUP },
      {
        $set: {
          ownerId,
          name,
          openingStock: 100000,
          supplier: "Mock R&D QA",
          pricePerKg: 0,
          minStock: 0,
          image: "",
          note: "วัตถุดิบ mock สำหรับทดสอบ R&D เท่านั้น ห้ามใช้ผลิตจริง",
          __rndMock: GROUP
        }
      },
      { upsert: true, new: true }
    ));
  }
  return docs;
}

async function upsertFormulas(ownerId) {
  const formulas = [];
  for (let typeIndex = 0; typeIndex < FORMULA_GROUPS.length; typeIndex += 1) {
    const group = FORMULA_GROUPS[typeIndex];
    for (let index = 0; index < group.recipes.length; index += 1) {
      const name = formulaName(typeIndex, index);
      const bom = recipeToBom(group.recipes[index]);
      const formula = await BomFormula.findOneAndUpdate(
        { ownerId, name, __rndMock: GROUP },
        {
          $set: {
            ownerId,
            name,
            color: group.color,
            bom,
            phases: recipeToPhases(),
            note: [
              `ประเภท mock: ${group.type}`,
              "ข้อมูลสูตรทั้งหมดเป็น mockup สำหรับทดสอบ R&D เท่านั้น",
              "ห้ามนำไปผลิตจริง"
            ],
            procedures: [
              "ขั้นตอน mock 1: เตรียม Mock R&D Aqua Base ในถังจำลอง",
              "ขั้นตอน mock 2: เติมวัตถุดิบกลุ่ม Mock R&D และกวนตามข้อมูลจำลอง",
              "ขั้นตอน mock 3: พักตัวอย่างและบันทึกผลทดสอบจำลอง"
            ],
            qcSpec: {
              ph: "Mock pH 5.0-6.0",
              viscosity: "Mock 1,000-2,000 cP",
              appearance: "Mock ลักษณะตามตัวอย่างจำลอง",
              scent: "Mock กลิ่นตามข้อมูลจำลอง",
              fillVolume: "Mock ตามใบสั่งผลิต",
              note: "QC mock เท่านั้น ไม่ใช่เกณฑ์ใช้งานจริง"
            },
            qcChecklistItems: [],
            qcMethod: "ตรวจข้อมูล mock เท่านั้น ห้ามใช้เป็นวิธี QC จริง",
            __rndMock: GROUP
          }
        },
        { upsert: true, new: true }
      );
      formulas.push(formula);
    }
  }
  return formulas;
}

function makeProduct(customer, group, formula, isDevelopment) {
  return {
    formulaName: formula.name,
    formulaId: formula._id,
    productName: `Mock R&D Product ${group.code}`,
    brand: customer.brand,
    customerName: customer.name,
    customerFormulaType: group.type,
    quantityPcs: customer.quantityPcs,
    bottleCount: customer.quantityPcs,
    nozzleCount: customer.quantityPcs,
    quantityKg: (customer.quantityPcs * customer.fillVolume) / 1000,
    bottleSize: `${customer.fillVolume} ml`,
    fillVolume: customer.fillVolume,
    packagingType: "Mock R&D ขวดทดสอบ",
    labelType: "Mock R&D ฉลากทดสอบ",
    nozzleType: "Mock R&D หัวฉีดทดสอบ",
    isDevelopment,
    productionStatus: "รับใบสั่งผลิต",
    productionStep: 1,
    isStockDeducted: false,
    isConfirmed: false,
    notes: "ข้อมูล R&D mockup เท่านั้น สูตรและสารเป็น mock ไม่ใช่สูตรจริง และไม่ตัดสต็อก"
  };
}

async function seed() {
  await clean();
  const owner = await getOwner();
  await upsertIngredients(owner._id);
  const formulas = await upsertFormulas(owner._id);

  const created = [];
  for (const customer of MOCK_CUSTOMERS) {
    const group = FORMULA_GROUPS[customer.typeIndex];
    const formula = formulas.find((item) => item.name === formulaName(customer.typeIndex, customer.index));
    const isDevelopment = customer.typeIndex === 2;
    const product = makeProduct(customer, group, formula, isDevelopment);
    const customFormulas = isDevelopment
      ? [{ formulaId: formula._id, name: formula.name, description: "ตัวเลือกสูตรพัฒนา mock", approved: false }]
      : [];

    const doc = await Customer.create({
      ownerId: owner._id,
      name: customer.name,
      email: `rnd-mock-${customer.typeIndex + 1}-${customer.index + 1}@mock.local`,
      phone: "000-000-0000",
      brand: customer.brand,
      line: "@mock-rd",
      section: "s11",
      orderType: isDevelopment ? "develop" : "lot",
      statusChangedAt: new Date(),
      formulaId: formula._id,
      orderedProducts: [{ ...product, customFormulas }],
      productionStatus: "รับใบสั่งผลิต",
      productionStep: 1,
      isStockDeducted: false,
      notes: `R&D mockup: ${group.type} | สูตร ${formula.name} | ไม่ใช่ข้อมูลจริง`,
      __rndMock: GROUP
    });
    created.push(doc);
  }

  console.log(`สร้าง R&D รับใบสั่งผลิต mock ${created.length} รายการ`);
  created.forEach((doc) => {
    const item = doc.orderedProducts[0];
    console.log(`${doc.name}: ${item.customerFormulaType} | ${item.formulaName}`);
  });
  console.log(`สูตร mock ${formulas.length} สูตร, สาร mock ${MOCK_INGREDIENTS.length} รายการ`);
  console.log("ยืนยัน: ทุกข้อมูลเป็น mockup และยังไม่ตัดสต็อก");
}

async function status() {
  const orders = await Customer.find({ __rndMock: GROUP }).lean();
  const formulas = await BomFormula.find({ __rndMock: GROUP }).lean();
  const ingredients = await Ingredient.find({ __rndMock: GROUP }).lean();
  console.log(JSON.stringify({
    orders: orders.map((order) => {
      const product = order.orderedProducts?.[0] || {};
      return {
        name: order.name,
        orderType: order.orderType,
        productionStatus: product.productionStatus || order.productionStatus,
        productionStep: product.productionStep || order.productionStep,
        customerFormulaType: product.customerFormulaType,
        formulaName: product.formulaName,
        isDevelopment: product.isDevelopment === true,
        isStockDeducted: product.isStockDeducted === true
      };
    }),
    formulas: formulas.map((formula) => ({ name: formula.name, ingredients: Object.keys(formula.bom || {}).length })),
    ingredients: ingredients.map((ingredient) => ({ name: ingredient.name, openingStock: ingredient.openingStock }))
  }, null, 2));
}

async function main() {
  const command = process.argv[2] || "seed";
  try {
    await connect();
    if (command === "clean") await clean();
    else if (command === "status") await status();
    else if (command === "seed") await seed();
    else throw new Error(`คำสั่งไม่ถูกต้อง: ${command} (ใช้ seed, clean หรือ status)`);
  } catch (error) {
    console.error("R&D mock seed error:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main();
