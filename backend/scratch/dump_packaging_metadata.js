import mongoose from 'mongoose';
import fs from 'fs';

const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017/erp_naive_innova";

const PackagingTypeSchema = new mongoose.Schema({}, { strict: false });
const PackagingItemSchema = new mongoose.Schema({}, { strict: false });
const UserSchema = new mongoose.Schema({}, { strict: false });
const RoleSchema = new mongoose.Schema({}, { strict: false });

const PackagingType = mongoose.model('PackagingType', PackagingTypeSchema, 'packagingtypes');
const PackagingItem = mongoose.model('PackagingItem', PackagingItemSchema, 'packagingitems');
const User = mongoose.model('User', UserSchema, 'users');
const Role = mongoose.model('Role', RoleSchema, 'roles');

async function run() {
  await mongoose.connect(mongoURI);
  console.log("Connected to MongoDB!");

  const types = await PackagingType.find({});
  const items = await PackagingItem.find({});
  const users = await User.find({});
  const roles = await Role.find({});

  const clientRole = roles.find(r => r.name === 'ลูกค้า');
  const clientRoleIdStr = clientRole ? clientRole._id.toString() : '';

  // Filter customers
  const customers = users.filter(u => {
    const roleVal = u.role ? u.role.toString() : '';
    return roleVal === clientRoleIdStr || u.role === 'ลูกค้า';
  });

  const typeMap = {};
  types.forEach(t => {
    typeMap[t._id.toString()] = t.name;
  });

  // Calculate KPIs
  const totalItems = items.length;
  let stockSufficient = 0;
  let stockLow = 0;
  let stockOut = 0;

  const tableRows = items.map(item => {
    const categoryName = typeMap[item.type?.toString()] || '-';
    const currentStock = item.currentQuantity || 0;
    
    let statusText = '';
    let statusClass = '';
    
    if (currentStock <= 0) {
      statusText = 'สินค้าหมด';
      stockOut++;
    } else if (currentStock < 500) {
      statusText = 'สต็อกใกล้หมด';
      stockLow++;
    } else {
      statusText = 'สต็อกเพียงพอ';
      stockSufficient++;
    }

    return `| ${item.name} | ${item.sku || '-'} | ${item.customer || 'ทั่วไป'} | ${categoryName} | ${currentStock.toLocaleString()} | ${statusText} |`;
  });

  const markdown = `# ข้อมูลทั้งหมดในหน้า Packaging (คลังบรรจุภัณฑ์)

หน้านี้แสดงข้อมูลสรุปบรรจุภัณฑ์, สต็อก, ประเภทหมวดหมู่ และรายชื่อลูกค้าที่มีอยู่ในระบบ ณ ปัจจุบัน

---

## 📊 1. ข้อมูลสรุปภาพรวม (KPI Cards)

*   **จำนวนรายการทั้งหมด (Total Items)**: **${totalItems}** รายการ
*   **สต็อกเพียงพอ (Sufficient Stock >= 500 ชิ้น)**: **${stockSufficient}** รายการ
*   **สต็อกใกล้หมด (Low Stock < 500 ชิ้น)**: **${stockLow}** รายการ
*   **สินค้าหมด (Out of Stock = 0 ชิ้น)**: **${stockOut}** รายการ

---

## 📂 2. ประเภทหมวดหมู่บรรจุภัณฑ์ (Packaging Categories)
มีทั้งหมด **${types.length}** หมวดหมู่ ดังนี้:
${types.map((t, idx) => `${idx + 1}. **${t.name}** (ID: \`${t._id}\`)`).join('\n')}

---

## 👥 3. ข้อมูลลูกค้าในระบบ (Customer Directory)
มีลูกค้าทั้งหมด **${customers.length}** คน ดังนี้:
${customers.map((c, idx) => `${idx + 1}. **${c.name}** (${c.email || 'ไม่มีอีเมล'}) - บทบาท: \`ลูกค้า\``).join('\n')}

---

## 📦 4. ตารางคลังบรรจุภัณฑ์ปัจจุบัน (Packaging Stock Table)

| ชื่อบรรจุภัณฑ์ | รหัส SKU | แบรนด์ลูกค้า | หมวดหมู่ | ระดับสต็อก (ชิ้น) | สถานะ |
| :--- | :--- | :--- | :--- | :--- | :--- |
${tableRows.join('\n')}
`;

  fs.writeFileSync('C:/Users/asus/Desktop/naive/MES/backend/scratch/packaging_data_dump.md', markdown, 'utf8');
  console.log("Successfully generated packaging_data_dump.md!");
  mongoose.connection.close();
}

run().catch(console.error);
