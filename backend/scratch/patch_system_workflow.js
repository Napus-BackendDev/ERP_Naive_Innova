import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/system.md';
let content = fs.readFileSync(path, 'utf8');

// Replace Section 1: ภาพรวมการไหลของระบบ (Business Pipeline & Workflow)
const startMarker = '## 1. ภาพรวมการไหลของระบบ (Business Pipeline & Workflow)';
const endMarker = '## 1.2 กฎทางธุรกิจและกระบวนการทำงานทางเลือก';

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker);

if (startIdx !== -1 && endIdx !== -1) {
  const oldSection = content.substring(startIdx, endIdx);
  const newSection = `## 1. ภาพรวมการไหลของระบบ (Swimlane Architecture & Workflow Diagram)

ระบบ Naive Ops จัดสรรการดำเนินงานแยกตามบทบาทแผนกผ่านสถาปัตยกรรมแถวเลนกิจกรรม (Swimlane Flow) ประสานงานข้อมูลและจุดควบคุมความปลอดภัยโดยสมบูรณ์ ดังแผนภาพจำลองระบบหลัก:

\`\`\`mermaid
graph TD
    %% Roles & Auth Lane
    subgraph Roles_Auth_Lane [1. Roles & Auth Lane]
        A1[Google Auth Login] --> A2{Check Roles}
        A2 -->|Admin / Manager| A3[Full Control Settings]
        A2 -->|QA / Operator| A4[Production / Inventory Read-Write]
        A2 -->|Client| A5[Order Status Tracking]
    end

    %% Sales CRM Lane
    subgraph Sales_CRM_Lane [2. Sales CRM Lane]
        B1[Lead Registration] --> B2[Negotiation Stage]
        B2 --> B3[Closed Won s11]
        B3 --> B4{Verify Down Payment}
        B4 -->|Fail / Pending| B5[Wait for Deposit Verification]
        B4 -->|Pass 50% or 100%| B6[Trigger Production Plan]
    end

    %% BOM & Formula Lane
    subgraph BOM_Formula_Lane [3. BOM & Formula Lane]
        C1[Fetch Product Formula] --> C2[Calculate Raw Ingredients]
        C2 --> C3{Check Raw Stock}
        C3 -->|Insufficient| C4[Flag Out of Stock / Order Ingredients]
        C3 -->|Sufficient| C5[Approve BOM & Print Production Order]
        C5 --> C6[Lock & Reserve Stock]
    end

    %% Inventory Lane
    subgraph Inventory_Lane [4. Inventory Lane]
        D1[Chemical Ingredients]
        D2[Packaging Bottles]
        D3[Caps & Pump Heads]
        D4[Stickers & Labels]
        D5[Outer Postal Boxes]
        C6 -->|Deduct Stock| D1
        C6 -->|Deduct Stock| D2
        C6 -->|Deduct Stock| D3
        C6 -->|Deduct Stock| D4
    end

    %% Production Line Lane
    subgraph Production_Line_Lane [5. Production Line Lane]
        E1[Step 1: Check inputs & stocks] --> E2[Step 2: QA Round 1 - empty pack]
        E2 --> E3[Step 3: Packaging checklist - filling]
        E3 --> E4[Step 4: Labeling & Wrapping - stamp lot]
        E4 --> E5[Step 5: QA Round 2 - upload photos & 5s video]
        E5 --> E6[Step 6: Completed - upload chat confirmation screenshot]
    end

    %% Finished Goods & Shipping Lane
    subgraph FG_Shipping_Lane [6. FG & Shipping Lane]
        F1[Generate FG Lot Number] --> F2[Store in FG Warehouse]
        F2 --> F3[Shipment Request]
        F3 --> F4[FEFO Lot Selection Algorithm]
        F4 --> F5[Deduct Product Stock]
        F5 --> F6[Client Delivery Complete]
    end

    %% Activity Logs / Audit Trails
    subgraph Audit_Trails [7. Audit Trails & Logs]
        L1[Checkpoint 1: Log Deal & Payment]
        L2[Checkpoint 2: Log BOM calculation & reserve]
        L3[Checkpoint 3: Log Production Step & QA Approve]
        L4[Checkpoint 4: Log FG lot dispatch & deduction]
    end

    %% Flow connections
    B6 -->|Auto trigger| C1
    C5 -->|Order generated| E1
    E2 -->|Link photos| D2
    E5 -->|Link final photos| D4
    E6 -->|Production complete| F1
    F6 -->|Done| A5

    %% Logging triggers
    B4 -->|Log transaction| L1
    C5 -->|Log approval| L2
    E2 -->|Log QA1| L3
    E5 -->|Log QA2| L3
    F4 -->|Log dispatch| L4
\`\`\`

### รายละเอียดการทำงานรายแผนก (Swimlane Flow Processing Details)

1. **1. Roles & Auth Swimlane (ระบบยืนยันตัวตนและคุมสิทธิ์)**:
   - ผู้ใช้งานทุกคนต้องผ่าน Google OAuth เพื่อระบุตัวตนและจับคู่สิทธิ์การทำงาน
   - **Admin/Manager**: เข้าถึงข้อมูลสต็อก ยอดเงิน ดีลขาย และการอนุมัติสูตร BOM ได้ทั้งหมด
   - **QA/Operator**: ดำเนินการและตรวจเช็คขั้นตอนในไลน์ผลิตและตรวจสอบสต็อกคลังวัสดุ
   - **Client**: ติดตามความคืบหน้าของล็อตสินค้าผ่านหน้าจอ Dashboard เฉพาะตัว

2. **2. Sales CRM Swimlane (ระบบงานขายและการรับเงิน)**:
   - ดีลงานของคลินิกคู่ค้าดำเนินตามท่อส่งงาน CRM (11 สถานะ)
   - เมื่อระบบตรวจพบค่านำเข้าว่าดีลอยู่ที่สถานะ "ปิดการขาย (s11)" และระบบตรวจสอบเงินมัดจำ (Down Payment) ได้รับครบถ้วน 50% หรือ 100% ระบบจะส่งคำสั่งสร้างคิววางแผนผลิตโดยอัตโนมัติ (Trigger Production Plan)

3. **3. BOM & Formula Swimlane (ระบบคำนวณและอนุมัติสูตรวัตถุดิบ)**:
   - หลังบ้านจะดึงสูตรวัตถุดิบและอัตราส่วนผสมของตัว SKU สินค้าที่สั่งมาคำนวณหักปริมาณคลังสารเคมีดิบ
   - หากยอดวัตถุดิบสารเคมีผ่านเกณฑ์ความพร้อม ระบบจะล็อก/จองสต็อกดิบเพื่อความปลอดภัย และอนุญาตให้ออกใบสั่งผลิต (BOM Formula Recipe Sheet) พร้อมเปิดสเต็ปในไลน์ผลิต

4. **4. Inventory Swimlane (คลังสินค้าและระบบหักยอดบรรจุภัณฑ์)**:
   - ระบบควบคุมยอดสต็อกแบบ Real-time แยกคลังระหว่าง: *สารเคมีผสม (Ingredients), ขวดบรรจุภัณฑ์ (Bottles), ฝาขวด/หัวปั๊ม (Caps/Pumps), ฉลากสินค้า (Stickers), และกล่องไปรษณีย์ (Postal Boxes)*
   - สต็อกจะถูกหักจองตั้งแต่ขั้นตอนคำนวณ BOM และถูกตัดสต็อกจริงหลังยืนยันการบรรจุผลิตในไลน์ผลิตเสร็จสิ้น

5. **5. Production Line Swimlane (ขั้นตอนสายผลิต 6-Step Wizard)**:
   - ไลน์ผลิตดำเนินงานตามตัวช่วยสร้าง 6 ขั้นตอน (Wizard Steps):
     - **Step 1**: ยืนยันวัตถุดิบ (ตรวจเช็คปริมาณลิตรของสารเคมีและระดับสต็อก ขวด, ฝา, สติกเกอร์)
     - **Step 2**: ตรวจสอบคุณภาพรอบที่ 1 (อัปโหลดรูปภาพขวดเปล่า, หัวปั๊ม และคลิปวิดีโอประกอบความยาว > 5 วินาที)
     - **Step 3**: ดำเนินการบรรจุผลิตภัณฑ์ (เช็กลิสต์ความเรียบร้อยการเตรียมขวด สติกเกอร์ สารเคมี และการบรรจุลงผลิตภัณฑ์)
     - **Step 4**: ติดฉลาก & ห่อหุ้ม (เช็กลิสต์การติดฉลากสติกเกอร์ ยิงล็อตวันที่ ซีลปากถุงพลาสติกอบความร้อน)
     - **Step 5**: ตรวจสอบคุณภาพรอบที่ 2 (อัปโหลดรูปถ่ายสินค้าสำเร็จรูป สติกเกอร์ ผลิตภัณฑ์เต็มตัว และคลิปหลักฐานความยาวไม่เกิน 5 วินาที)
     - **Step 6**: เสร็จสิ้นขั้นตอนผลิต (รอลูกค้ายืนยันและจัดส่ง โดยจัดแสดงหลักฐานรูปภาพหน้าจอแชทคอนเฟิร์ม)

6. **6. FG & Shipping Swimlane (คลังสินค้าสำเร็จรูปและการจัดส่ง FEFO)**:
   - สินค้าที่ผลิตเสร็จสิ้นจะเข้าสู่ระบบคลัง FG และออกรหัสล็อตผลิตอ้างอิงจากวันเสร็จสิ้นงาน
   - เมื่อมีธุรกรรมส่งมอบออกให้ลูกค้า ระบบจะรันคำนวณ **FEFO (First-Expired, First-Out)** เพื่อหยิบล็อตที่ใกล้หมดอายุก่อนมาทำการตัดจ่ายคลังสินค้า และส่งมอบสินค้าอย่างเป็นทางการ

7. **7. Audit Trails & Logs (จุดตรวจประวัติและควบคุมความปลอดภัย)**:
   - **Checkpoint 1 (CRM)**: บันทึกข้อมูลใบเสร็จรับเงิน การปิดขาย และเวลาที่ดีลเปลี่ยนเป็นใบงานผลิต
   - **Checkpoint 2 (BOM)**: บันทึกประวัติการคำนวณ การเบิกจ่ายจอง และชื่อผู้อนุมัติสูตรเคมี
   - **Checkpoint 3 (Production & QA)**: บันทึกประวัติการติ๊กเช็กลิสต์ผลผลิต วันเวลาตรวจ และรูปถ่าย QA ทั้งหมด
   - **Checkpoint 4 (FG & Sales Delivery)**: บันทึกประวัติการตัดล็อตสินค้าสำเร็จรูปด้วยหลัก FEFO และเวลาส่งมอบปลายทาง

`;

  content = content.replace(oldSection, newSection);
  fs.writeFileSync(path, content, 'utf8');
  console.log("Successfully patched system.md with the visual swimlane workflow!");
} else {
  console.log("Could not find Section 1 markers in system.md!");
}
