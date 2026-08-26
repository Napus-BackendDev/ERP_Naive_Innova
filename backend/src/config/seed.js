import mongoose from "mongoose";
import connectDB from "./db.js";
import User from "../features/users/user.model.js";
import Role from "../features/users/role.model.js";
import Ingredient from "../features/bom/ingredient.model.js";
import BomFormula from "../features/bom/bomFormula.model.js";
import PackagingItem from "../features/packaging/packagingItem.model.js";
import ProductSku from "../features/fg/productSku.model.js";
import ProductLot from "../features/fg/productLot.model.js";
import PackagingType from "../features/packaging/packagingType.model.js";

const seedData = async () => {
  try {
    await connectDB();

    // 0. Seed Roles first
    const napusUser = await User.findOne({ email: "napus.dev@gmail.com" });
    await User.deleteMany({});
    await Role.deleteMany({});

    const adminRole = await Role.create({
      name: "Admin",
      description: "ผู้ดูแลระบบสูงสุด",
      permissions: ["manage_users", "view_all_data", "edit_data"]
    });
    const customerRole = await Role.create({
      name: "ลูกค้า",
      description: "ลูกค้าผู้ติดต่อสั่งซื้อสินค้า",
      permissions: []
    });
    console.log("Roles seeded successfully.");

    // Preserve Napus user record as Admin
    if (napusUser) {
      await User.create({
        googleId: napusUser.googleId,
        email: napusUser.email,
        name: napusUser.name,
        avatarUrl: napusUser.avatarUrl,
        role: adminRole._id
      });
      console.log("Preserved Napus Samuanpho user record as Admin.");
    } else {
      await User.create({
        googleId: "precreated-napus",
        email: "napus.dev@gmail.com",
        name: "Napus Samuanpho",
        avatarUrl: "",
        role: adminRole._id
      });
      console.log("Pre-created Napus Samuanpho user record as Admin.");
    }
    await PackagingItem.deleteMany({});
    await ProductSku.deleteMany({});
    await ProductLot.deleteMany({});
    await PackagingType.deleteMany({});

    console.log("Database cleared.");

    // 1. Create Mock Admin User
    const mockUser = await User.create({
      googleId: "mock-google-id-123",
      email: "mock.admin@naiveops.com",
      name: "Mock Admin",
      avatarUrl: "https://lh3.googleusercontent.com/a/default-user",
      role: adminRole._id
    });

    const ownerId = mockUser._id;
    console.log(`Mock owner user created: ${mockUser.email}`);

    // 2. Create Mock Customers (ลูกค้า) with CRM fields
    const salesMock = [
      { section: "s1", name: "คลินิกเอิทเพ็ท รักษาสัตว์", province: "นครสวรรค์", phone: "094-3916635", estValue: 5000, payPct: "50", paidAmount: 2500, email: "earthpet@gmail.com" },
      { section: "s1", name: "คลินิกพีรณัฐ รักษาสัตว์", province: "นครสวรรค์", phone: "084-5557551", notes: "นครสวรรค์", email: "peeranat@gmail.com" },
      { section: "s1", name: "เมืองพิจิตรรักษาสัตว์", province: "พิจิตร", phone: "087-5449509", email: "phichit.pet@gmail.com" },
      { section: "s1", name: "โรงพยาบาลสัตว์พิจิตร", province: "พิจิตร", phone: "", email: "phichithosp@gmail.com" },
      { section: "s2", name: "จติกา คุ้มเรือน (คุณฟูจิ)", province: "สมุทรปราการ", phone: "087-2341494", email: "fuji@gmail.com" },
      { section: "s2", name: "คุณผึ้ง", province: "อุบลราชธานี", phone: "063-6258925", email: "phueng@gmail.com" },
      { section: "s2", name: "สุธิตา ทองอินทร์", province: "นนทบุรี", phone: "082-1492644", email: "suthita@gmail.com" },
      { section: "s2", name: "น.ส.ธารียะ มาลา", province: "เชียงใหม่", phone: "085-5110095", assignee: "ก", assigneeColor: "#3b82f6", email: "thariya@gmail.com" },
      { section: "s4", name: "บ้านหมอน้อยสัตวแพทย์", province: "เชียงราย", phone: "089-838-1597", contactPerson: "หมอน้อย", email: "mornoi@gmail.com" },
      { section: "s4", name: "คลินิกรักษาสัตว์เพ็ทเมดิก", province: "นครสวรรค์", phone: "099-6289388", contactPerson: "หมอฟ้า", email: "petmedic@gmail.com" },
      { section: "s5", name: "คลินิกรักษาสัตว์เพ็ทโฮม", province: "เชียงราย", phone: "084-175-8884", email: "pethome@gmail.com" },
      { section: "s5", name: "คลินิกบ้าน ป.ปลา รักษาสัตว์", province: "แพร่", phone: "", email: "baanppla@gmail.com" },
      { section: "s6", name: "หมอแจ็ครักษาสัตว์(หมอแจ็ค)", province: "ตาก", phone: "093-1982255", dueDate: "14 พ.ย. 2025", email: "jackpet@gmail.com" },
      { section: "s6", name: "ลำปางรักษาสัตว์", province: "ลำปาง", phone: "080-9492562", contactPerson: "หมอยะ", email: "lampangpet@gmail.com" },
      { section: "s7", name: "คำหลวงรักษาสัตว์ (หมอเบ็ญ)", province: "เชียงราย", phone: "065-019-5000", dueDate: "13 ม.ค.", email: "kamluang@gmail.com" },
      { section: "s10", name: "อัครชา เชือนเชื้อ", province: "กรุงเทพมหานคร", phone: "094-4834199", email: "akaracha@gmail.com" },
      { section: "s11", name: "พนิดา ตุวัฒนศิลป์ (คุณ จ๊ะ)", province: "กรุงเทพมหานคร", phone: "081-9026679", estValue: 62381, payPct: "50", paidAmount: 31190, email: "jah@gmail.com" },
      { section: "s11", name: "คุณแอน", province: "ลำพูน", estValue: 20670, payPct: "100", paidAmount: 20670, email: "ann@gmail.com" }
    ];

    const customersToCreate = [
      {
        googleId: "mock-customer-id-1",
        email: "somsak@gmail.com",
        name: "คุณสมศักดิ์ รักดี",
        role: customerRole._id,
        ownerId: ownerId,
        line: "somsak.line",
        facebook: "Somsak Rakdee FB",
        tiktok: "somsak_tiktok",
        section: "s1"
      },
      {
        googleId: "mock-customer-id-2",
        email: "nakonsawan.pet@gmail.com",
        name: "ร้านนครสวรรค์รักษาสัตว์",
        role: customerRole._id,
        ownerId: ownerId,
        line: "nks.pet",
        facebook: "Nakhonsawan Pet FB",
        tiktok: "",
        section: "s1"
      },
      {
        googleId: "mock-customer-id-3",
        email: "contact@petcare.co.th",
        name: "บริษัท เพ็ทแคร์ จำกัด",
        role: customerRole._id,
        ownerId: ownerId,
        line: "",
        facebook: "Pet Care Co FB",
        tiktok: "petcare_official",
        section: "s1"
      },
      ...salesMock.map((x, idx) => ({
        googleId: `mock-customer-lead-${idx}`,
        email: x.email,
        name: x.name,
        role: customerRole._id,
        ownerId: ownerId,
        phone: x.phone || "",
        line: x.line || "",
        facebook: x.facebook || "",
        tiktok: x.tiktok || "",
        province: x.province || "",
        notes: x.notes || "",
        estValue: x.estValue || 0,
        payPct: x.payPct || "",
        paidAmount: x.paidAmount || 0,
        section: x.section || "s1",
        assignee: x.assignee || "",
        assigneeColor: x.assigneeColor || "",
        dueDate: x.dueDate || ""
      }))
    ];

    await User.create(customersToCreate);
    console.log("Mock customers and Sales CRM data seeded into User collection.");

    // 3. Seed/Update BOM Formulas & Ingredients by copying from stockManagerDB
    console.log("Copying ingredients and formulas from stockManagerDB...");
    const stockManagerDb = mongoose.connection.useDb("stockManagerDB");

    // Fetch legacy data
    const legacyIngredients = await stockManagerDb.collection("ingredients").find({}).toArray();
    const legacyProducts = await stockManagerDb.collection("products").find({}).toArray();

    console.log(`Found ${legacyIngredients.length} ingredients and ${legacyProducts.length} products in stockManagerDB.`);

    // Clear current database's collections
    await Ingredient.deleteMany({});
    await BomFormula.deleteMany({});

    // Import Ingredients (supporting both legacy short names o/s/p and standard names)
    const ingredientsToInsert = legacyIngredients.map(x => {
      const stock = x.openingStock !== undefined ? x.openingStock : x.o;
      const supplier = x.supplier !== undefined ? x.supplier : x.s;
      const price = x.pricePerKg !== undefined ? x.pricePerKg : x.p;
      return {
        ownerId,
        name: x.name,
        openingStock: parseFloat(stock) || 0,
        supplier: supplier || "",
        pricePerKg: parseFloat(price) || 0
      };
    });
    await Ingredient.create(ingredientsToInsert);
    console.log(`Copied ${ingredientsToInsert.length} ingredients into target database.`);

    // Import Products (BOM Formulas)
    const formulasToInsert = legacyProducts.map(x => ({
      ownerId,
      name: x.name,
      color: x.color || "#2E7D32",
      bom: x.bom // bom is already mapped to Map/Object format!
    }));
    await BomFormula.create(formulasToInsert);
    console.log(`Copied ${formulasToInsert.length} BOM formulas into target database.`);

    // 4. Seed Packaging Types first
    const typeNames = ["บรรจุภัณฑ์", "กล่อง&ซอง", "สินค้าพร้อมส่ง", "อื่นๆ"];
    const seededTypes = {};
    for (const name of typeNames) {
      const pType = await PackagingType.create({ ownerId, name });
      seededTypes[name] = pType._id;
    }
    console.log("Packaging types seeded.");

    const packagingMock = [
      { name: "ขวดแชมพู 100ml สีขาว", typeName: "บรรจุภัณฑ์", customer: "นาอีฟ", currentQuantity: 1240 },
      { name: "ฝาแชมพู 100ml สีขาว", typeName: "บรรจุภัณฑ์", customer: "คุณแยม", currentQuantity: 6000 },
      { name: "ขวด Hair Raise 100ml", typeName: "บรรจุภัณฑ์", customer: "นาอีฟ", currentQuantity: 5000 },
      { name: "ขวดสเปรย์ 50ml", typeName: "บรรจุภัณฑ์", customer: "นาอีฟ", currentQuantity: 320 },
      { name: "หัวปั๊มโฟม", typeName: "บรรจุภัณฑ์", customer: "คุณแยม", currentQuantity: 480 },
      { name: "ฉลากแชมพูไบโอ", typeName: "บรรจุภัณฑ์", customer: "นาอีฟ", currentQuantity: 8500 },
      { name: "กล่องบรรจุ 1 ขวด", typeName: "กล่อง&ซอง", customer: "กลาง", currentQuantity: 220 },
      { name: "ซองฟอยล์ 30ml", typeName: "กล่อง&ซอง", customer: "กลาง", currentQuantity: 120 },
      { name: "ขวดเจล 50g", typeName: "บรรจุภัณฑ์", customer: "คุณอร", currentQuantity: 3960 },
      { name: "ฝากระปุกเจล", typeName: "บรรจุภัณฑ์", customer: "คุณอร", currentQuantity: 0 },
      { name: "กล่อง O", typeName: "กล่อง&ซอง", customer: "ระบบ", currentQuantity: 56 },
      { name: "กล่อง A", typeName: "กล่อง&ซอง", customer: "ระบบ", currentQuantity: 20 },
    ];
    await PackagingItem.create(packagingMock.map(x => ({ 
      ownerId, 
      name: x.name, 
      type: seededTypes[x.typeName] || seededTypes["อื่นๆ"], 
      customer: x.customer, 
      currentQuantity: x.currentQuantity 
    })));
    console.log("Packaging items seeded.");

    // 5. Seed Finished Goods SKUs
    const fgSkusMock = [
      { id: "1", name: "Bio-Shampoo", brand: "OEM", category: "แชมพู", unit: "ขวด" },
      { id: "2", name: "น้ำยาเช็ดหู/ตา", brand: "OEM", category: "น้ำยาทำความสะอาด", unit: "ขวด" },
      { id: "3", name: "Nano Spray", brand: "OEM", category: "สเปรย์", unit: "ขวด" },
      { id: "4", name: "Hair Coat", brand: "OEM", category: "บำรุงขน", unit: "ขวด" },
      { id: "5", name: "Tear Stain Cleanser", brand: "OEM", category: "น้ำยาทำความสะอาด", unit: "ขวด" },
      { id: "6", name: "Wound Healing Gel 1kg", brand: "OEM", category: "เจล", unit: "กระปุก" },
      { id: "7", name: "Dry Foam Shampoo", brand: "OEM", category: "แชมพู", unit: "ขวด" },
      { id: "8", name: "Milk Shampoo", brand: "OEM", category: "แชมพู", unit: "ขวด" },
      { id: "9", name: "Bio-Shampoo ลดต้นทุน", brand: "OEM", category: "แชมพู", unit: "ขวด" },
      { id: "10", name: "สเปรย์บำรุงขน", brand: "Own Brand", category: "สเปรย์", unit: "ขวด" },
    ];
    await ProductSku.create(fgSkusMock.map(x => ({ ownerId, ...x })));
    console.log("Finished Goods SKUs seeded.");

    // 6. Seed Finished Goods Lots
    const fgLotsMock = [
      { productId: "2", lotNo: "2-090426-1", quantity: 73, mfgDate: new Date("2026-04-09"), expDate: new Date("2028-04-09"), customer: "Naive" },
      { productId: "1", lotNo: "1-150526-A", quantity: 120, mfgDate: new Date("2026-05-15"), expDate: new Date("2028-05-15"), customer: "Naive" },
      { productId: "1", lotNo: "1-200326-B", quantity: 18, mfgDate: new Date("2026-03-20"), expDate: new Date("2026-07-20"), customer: "คุณแยม" },
      { productId: "3", lotNo: "3-100626-A", quantity: 64, mfgDate: new Date("2026-06-10"), expDate: new Date("2028-06-10"), customer: "Naive" },
      { productId: "6", lotNo: "6-010526-A", quantity: 8, mfgDate: new Date("2026-05-01"), expDate: new Date("2026-07-15"), customer: "Glowmate" },
      { productId: "4", lotNo: "4-120626-A", quantity: 45, mfgDate: new Date("2026-06-12"), expDate: new Date("2028-06-12"), customer: "Naive" },
    ];
    await ProductLot.create(fgLotsMock.map(x => ({ ownerId, ...x })));
    console.log("Finished Goods Lots seeded.");

    console.log("Seeding process completed successfully!");
    mongoose.connection.close();
  } catch (error) {
    console.error(`Seeding failed: ${error.message}`);
    process.exit(1);
  }
};

seedData();
