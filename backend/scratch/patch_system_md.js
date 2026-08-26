import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/system.md';
let content = fs.readFileSync(path, 'utf8');

// Add Section 3.1 (Production Wizard Schema & Endpoints) above Section 4
const insertMarker = '## 4. แผนงานการพัฒนาสู่ระบบจริง';
const insertIdx = content.indexOf(insertMarker);

if (insertIdx !== -1) {
  const newSection = `## 3.1 โครงสร้างสายการผลิตและขั้นตอนผลิต (Production Line & 6-Step Wizard)

เพื่อความสมบูรณ์ในการย้ายการผลิตลงสู่ฐานข้อมูล MongoDB ระบบมีการเก็บสถานะและหลักฐานรูปภาพจริงโดยแชร์โมเดลกับบัญชีลูกค้า (User Model) ดังนี้:

### A. ข้อมูลสถานะและไฟล์แนบของการผลิต (Production Fields in User Model)
* \`productionStatus\`: สถานะขั้นตอนผลิตปัจจุบัน (เช่น \`ยังไม่ผลิต\`, \`รอยืนยัน\`, \`กำลังผลิต (บรรจุ)\`, \`กำลังผลิต (ติดฉลาก)\`, \`รอตรวจ QA รอบที่ 2\`, \`รอลูกค้ายืนยัน\`, \`ลูกค้ายืนยันแล้ว\`, \`สำเร็จเสร็จสิ้น\`)
* \`productionStep\`: หมายเลขขั้นตอนปัจจุบัน (สเต็ป 1 ถึง 6)
* \`qa1BulkPhoto\` / \`qa1EmptyPackPhoto\` / \`qa1PackagingPhoto\` / \`qa1PumpPhoto\` / \`qa1StickerPhoto\` / \`qa1AssembledVideo\`: รูปภาพและวิดีโอหลักฐานการตรวจ QA รอบที่ 1
* \`qaPackagingPhoto\` / \`qaPumpPhoto\` / \`qaStickerPhoto\` / \`qaAssembledVideo\`: รูปภาพและวิดีโอหลักฐานการตรวจ QA รอบที่ 2 (ความยาวไม่เกิน 5 วินาที)
* \`chatScreenshotProof\`: รูปภาพหลักฐานการแชทคอนเฟิร์มรับสินค้าจากลูกค้า (จัดเก็บเป็น Base64 ใน MongoDB)
* \`qaStatus\`: สถานะการตรวจ (\`pending\`, \`approved\`, \`rejected\`)

### B. จุดเชื่อมต่อข้อมูลสายการผลิต (Production API Endpoints)
* \`GET /api/production/orders\`: ดึงรายการใบสั่งผลิตทั้งหมด แยกตามสิทธิ์บทบาท (Row Isolation)
* \`GET /api/production/orders/:id\`: ดึงรายละเอียดใบสั่งผลิตรายบุคคล
* \`PUT /api/production/orders/:id/status\`: อัปเดตสถานะการผลิต แนบรูปแชทยืนยันจากลูกค้าลงฐานข้อมูลโดยตรง
* \`PUT /api/production/orders/:id/step\`: อัปเดตเช็กลิสต์การตรวจ ขั้นตอนสเต็ปการผลิต และข้อมูล Base64 ของไฟล์รูปถ่าย/คลิปวิดีโอในแต่ละขั้นตอน

---

`;

  content = content.substring(0, insertIdx) + newSection + content.substring(insertIdx);
  console.log("Successfully added Production Wizard Schema details!");
} else {
  console.log("Could not find insertMarker!");
}

// Update Section 4 to mark progress and complete milestones
const oldPlan = `## 4. แผนงานการพัฒนาสู่ระบบจริง (Implementation MVP Plan)

การเปลี่ยนรูปจาก Single HTML ไปสู่ Full System จะแบ่งเป็น 4 ระยะหลัก:

* **เฟส 1: โครงสร้างและการจัดเตรียมระบบหลังบ้าน (Backend Setup, DB Seed & Auth)**
  - ติดตั้งโปรเจกต์ Next.js, Express Server และทำการเชื่อมต่อ MongoDB
  - พัฒนาระบบ Google OAuth และ Middleware สำหรับกรองข้อมูลระดับแถว (Row Isolation Filter)
  - สร้าง Mongoose Models ทั้งหมดและเขียนตัวสคริปต์เพื่อย้าย (Migrate) ข้อมูลจาก Seed arrays ของตัว Single HTML เข้าระบบฐานข้อมูล MongoDB
* **เฟส 2: การพัฒนาหน้ากากด้วย Next.js + Hero UI Components & UI/UX Audit**
  - นำชุด JavaScript ของโมดูลต่าง ๆ (\`sales-module\`, \`bom-module\`, \`pkg-module\`, \`fg-module\`) มาแยกส่วนและประกอบเป็นคอมโพเนนต์แยกย่อย (Reusable Client Components) ใน Next.js
  - จัดการสถานะการทำงาน (State Management) เพื่อเชื่อมโยงปุ่มต่าง ๆ
  - ออกแบบปุ่มและโครงสร้างหน้าเพจตามกฎ UI/UX Design System Rules (Premium Dark UI)
* **เฟส 3: ระบบออกรายงานและการจัดรูปแบบข้อมูล (Export Engine)**
  - เขียนระบบ Endpoint หลังบ้านเพื่อประมวลผลการดาวน์โหลดไฟล์ Excel (.xlsx) และ CSV
  - นำปุ่มดาวน์โหลดรายงานไปใส่ในหน้าตารางธุรกรรม สรุปสต็อก และหน้า Dashboard
* **เฟส 4: เชื่อมต่อ API (API Integration) และการทดสอบ**
  - สร้าง Endpoint API สำหรับประมวลผลธุรกรรม (Transaction) ให้หักลบสต็อกแบบเรียลไทม์ และใช้หลัก FEFO ในการดึงล็อตสินค้าสำเร็จรูป
  - ทดสอบระบบนำเข้า/ส่งออกข้อมูลผ่าน CSV เพื่อให้ลูกค้าใช้งานอย่างต่อเนื่อง`;

const newPlan = `## 4. แผนงานการพัฒนาสู่ระบบจริง (Implementation MVP Plan)

การพัฒนา Naive Ops ได้ดำเนินงานคืบหน้าตามแผนงานของระบบจริงดังนี้:

* **[x] เฟส 1: โครงสร้างและการจัดเตรียมระบบหลังบ้าน (Backend Setup, DB Seed & Auth)**
  - [x] ติดตั้งโปรเจกต์ Next.js, Express Server และทำการเชื่อมต่อ MongoDB
  - [x] พัฒนาระบบ Auth และเชื่อมโยงผู้ใช้กับ API
  - [x] ออกแบบโครงสร้าง Mongoose Models ครอบคลุมผู้ใช้, สูตร BOM, คลังสินค้า และบรรจุภัณฑ์
* **[x] เฟส 2: การพัฒนาส่วนหน้าจอแสดงผลและคอมโพเนนต์ (Frontend Development & UI/UX)**
  - [x] ประกอบโมดูลหลักเป็นคอมโพเนนต์ย่อยใน Next.js (Sales CRM, BOM, คลังสินค้า)
  - [x] ออกแบบและปรับปรุงธีมสีแบรนด์เขียว/เทาเข้ม (Premium Green-Themed UI) ของระบบอย่างสวยงาม
  - [x] ปรับรูปแบบหน้าจอยืนยันวัตถุดิบและรายการตรวจสอบ (Checklist 6 ขั้นตอน) ให้ลื่นไหล ตอบโจทย์การใช้งานจริง
* **[x] เฟส 3: เชื่อมต่อหลังบ้านสายการผลิตและฐานข้อมูล (Production API & MongoDB Integration)**
  - [x] เปลี่ยนผ่านระบบพักจำลอง \`localStorage\` สู่การเชื่อมต่อ API จริงผ่าน Axios ไปยังฐานข้อมูล MongoDB
  - [x] พัฒนา API รับส่งรหัสโค้ดรูปภาพ/วิดีโอ (Base64) เซฟบันทึกจริงลงคอลเลกชัน MongoDB
  - [x] แยกคอลัมน์ขั้นตอนที่ 1 เป็น 2 ฝั่ง (ฝั่งซ้าย: สูตร/ปริมาณลิตรเคมี, ฝั่งขวา: สถานะเช็คสต็อกบรรจุภัณฑ์) เพื่อให้อ่านและตรวจสอบความพร้อมในสายผลิตง่ายที่สุด
  - [x] แบ่งเช็กลิสต์ย่อยขั้นตอนบรรจุหีบห่อเป็นขั้นตอนที่ 3 (บรรจุภัณฑ์) และขั้นตอนที่ 4 (ติดฉลาก & ห่อหุ้ม) แบบแนวนอน 4 ช่องแถวเดียว (Aspect Ratio 1:1) ชิดซ้าย พร้อมไอคอนสัญลักษณ์เข้าใจง่าย
  - [x] จำกัดความยาวคลิปหลักฐานสเต็ป 5 (QA รอบที่ 2) ไม่เกิน 5 วินาที
  - [x] ออกแบบหน้าจอนำเข้าภาพหลักฐานแชทยืนยันของลูกค้าเพื่ออนุมัติปิดล็อตในสเต็ปที่ 6
* **[/] เฟส 4: ระบบการเบิกล็อตสินค้าสำเร็จรูปและ Export Engine**
  - [x] เขียนโมดูลสรุปสถิติจำนวนรวมการผลิตและชาร์ตรายงานผลหน้า Dashboard
  - [ ] พัฒนาระบบเบิกจ่ายสินค้าสำเร็จรูป Lotting FEFO
  - [ ] จัดทำระบบส่งออกรายงานประวัติและสต็อก Excel (.xlsx) และ CSV`;

content = content.replace(oldPlan, newPlan);
fs.writeFileSync(path, content, 'utf8');
console.log("Successfully updated system.md!");
