import mongoose from "mongoose";
import dotenv from "dotenv";
import Customer from "../src/features/customers/customer.model.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("MONGODB_URI not found in .env file!");
  process.exit(1);
}

async function run() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected successfully!");

    // Find some active customers (not completed)
    const customers = await Customer.find({}).limit(8);
    
    if (customers.length === 0) {
      console.log("No customers found in database. Exiting...");
      process.exit(0);
    }

    console.log(`Found ${customers.length} customers to update.`);

    // Distribute them across different stages:
    // 0: filling, 1: labeling, 2: lot, 3: sealing (in pack tab)
    // 4: เสร็จสิ้น (in finish tab)
    // 5: รอตรวจ QC รอบที่ 2 (in finish tab)
    // 6: filling, 7: labeling (in pack tab)

    const subSteps = ["filling", "labeling", "lot", "sealing"];

    for (let i = 0; i < customers.length; i++) {
      const cust = customers[i];
      
      // Ensure orderedProducts is populated with formula name for better view
      if (!cust.orderedProducts || cust.orderedProducts.length === 0) {
        cust.orderedProducts = [
          {
            formulaName: "สูตรทดสอบพรีเมียม (Mock)",
            quantityPcs: 500,
            bottleSize: "100 ml",
            fillVolume: "100 ml",
            packagingType: "ขวดปั๊มใสฝาเงิน",
            labelType: "ฉลากสติ๊กเกอร์กันน้ำ PP"
          }
        ];
      }

      if (i === 4) {
        cust.productionStatus = "สำเร็จเสร็จสิ้น";
        cust.productionStep = 6;
        cust.packagingSubStep = "sealing";
        console.log(`Updated Customer: ${cust.name} -> productionStatus: สำเร็จเสร็จสิ้น`);
      } else if (i === 5) {
        cust.productionStatus = "รอตรวจ QC รอบที่ 2";
        cust.productionStep = 5;
        cust.packagingSubStep = "sealing";
        console.log(`Updated Customer: ${cust.name} -> productionStatus: รอตรวจ QC รอบที่ 2`);
      } else {
        const stepIndex = i % subSteps.length;
        const subStep = subSteps[stepIndex];
        cust.productionStatus = "รอบรรจุ";
        cust.productionStep = 4;
        cust.packagingSubStep = subStep;
        
        // Seed default values for LOT
        cust.lotStampNo = `LOT20260715-0${i + 1}`;
        cust.lotPosition = "ก้นขวดด้านล่างขวา";
        
        console.log(`Updated Customer: ${cust.name} -> packagingSubStep: ${subStep}`);
      }

      await cust.save();
    }

    console.log("Mock data setup completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error setting up mock data:", error);
    process.exit(1);
  }
}

run();
