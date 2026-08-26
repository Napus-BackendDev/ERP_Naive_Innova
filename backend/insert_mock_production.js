import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const CustomerSchema = new mongoose.Schema({}, { strict: false, collection: 'customers' });
const Customer = mongoose.model("Customer", CustomerSchema);

const BomFormulaSchema = new mongoose.Schema({}, { strict: false, collection: 'bomformulas' });
const BomFormula = mongoose.model("BomFormula", BomFormulaSchema);

const UserSchema = new mongoose.Schema({}, { strict: false, collection: 'users' });
const User = mongoose.model("User", UserSchema);

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const user = await User.findOne();
        if (!user) {
            console.log("No user found");
            return;
        }

        const formulaName = "เซรั่มสูตรพิเศษจำลอง (Mock Formula)";

        // Create Formula
        const formulaData = {
            ownerId: user._id,
            name: formulaName,
            color: "#2E7D32",
            bom: {
                "Water (Aqua)": 750,
                "Glycerin": 100,
                "Sodium Hyaluronate (1%)": 50,
                "Niacinamide (Vitamin B3)": 40,
                "Phenoxyethanol": 10,
                "Fragrance": 50
            },
            phases: {
                "Water (Aqua)": "A",
                "Glycerin": "A",
                "Sodium Hyaluronate (1%)": "B",
                "Niacinamide (Vitamin B3)": "B",
                "Phenoxyethanol": "C",
                "Fragrance": "C"
            },
            procedures: [
                "ผสมส่วนผสม Phase A ทั้งหมดเข้าด้วยกัน แล้วให้ความร้อนจนถึงอุณหภูมิ 75-80°C",
                "เตรียม Phase B ให้เข้ากัน แล้วค่อยๆ เติมลงใน Phase A พร้อมกับคนตลอดเวลา",
                "รอให้อุณหภูมิลดลงเหลือ 40-45°C แล้วเติม Phase C ลงไป",
                "คนให้เข้ากันจนเป็นเนื้อเดียว แล้วพักไว้เพื่อรอตรวจ QC รอบแรก"
            ],
            note: [
                "ระวังอย่าให้อุณหภูมิเกิน 80 องศาเซลเซียสเพื่อป้องกันการเสื่อมสภาพของสาร",
                "คนช้าๆ เพื่อป้องกันการเกิดฟองอากาศ"
            ]
        };

        const mockFormula = new BomFormula(formulaData);
        await mockFormula.save();
        console.log("Mock Formula inserted successfully.");

        // Create Customer
        const customerData = {
            name: "Mock Customer for UI Check (Risen)",
            brand: "Risen Brand",
            notes: "ที่มา: Asana Sales Pipeline - Stage เดิม\nสรุปการคุย: ทดสอบการแสดงผลกล่องหมายเหตุในหน้า Production และเอกสารใบสั่งผลิต - Task ID: 999999999",
            orderType: "lot",
            orderedProducts: [{ 
                formulaName: formulaName, 
                quantityPcs: 100,
                productionStep: 2,
                productionStatus: "รอบรรจุ" 
            }],
            productionStatus: "รอบรรจุ",
            productionStep: 2
        };

        const mockCustomer = new Customer(customerData);
        await mockCustomer.save();
        console.log("Mock Customer inserted successfully.");

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await mongoose.disconnect();
    }
}
run();
