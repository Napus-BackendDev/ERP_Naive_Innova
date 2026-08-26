import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/backend/src/features/production/production.routes.js';
let code = fs.readFileSync(path, 'utf8');

// The deduction helper logic as a string
const deductionLogic = `
    // Auto deduct packaging stocks when transitioning to "กำลังผลิต"
    if (
      (updateData.productionStatus === "กำลังผลิต" || updateData.productionStep >= 4) && 
      !originalOrder.isStockDeducted
    ) {
      let qtyNeeded = 0;
      if (originalOrder.orderedProducts) {
        if (Array.isArray(originalOrder.orderedProducts)) {
          qtyNeeded = originalOrder.orderedProducts.reduce((sum, p) => sum + (parseInt(p.quantityPcs || p.quantity) || 0), 0);
        } else if (typeof originalOrder.orderedProducts === "object") {
          qtyNeeded = parseInt(originalOrder.orderedProducts.quantityPcs || originalOrder.orderedProducts.quantity) || 0;
        }
      }
      if (qtyNeeded === 0) qtyNeeded = 30;

      try {
        const PackagingItem = (await import("../packaging/packagingItem.model.js")).default;
        // Fetch packaging items matching ownerId or admin
        const packagingItems = await PackagingItem.find({ ownerId: originalOrder.ownerId });
        
        const bottleKeywords = ["ขวด", "หลอด", "ซอง"];
        const bottleTypes = ["บรรจุภัณฑ์", "ขวดสเปรย์", "ขวดโฟม", "หลอดบีบ", "ขวด HDPE", "ซองฟอยล์", "ขวดเซรั่ม", "ขวดปั๊ม", "ขวดแชมพู", "ขวดแก้ว", "หลอดหัวปั้ม", "ขวดดรอปเปอร์"];
        const matchedBottle = packagingItems.find(item => 
          (bottleTypes.includes(item.type?.name) || bottleKeywords.some(kw => item.name?.includes(kw)))
        );

        const capKeywords = ["ฝา", "หัวปั๊ม", "หัวปั้ม", "ฝาขวด"];
        const matchedCap = packagingItems.find(item => 
          (item.type?.name?.includes("ฝา") || item.type?.name?.includes("ปั๊ม") || capKeywords.some(kw => item.name?.includes(kw)))
        );

        const labelKeywords = ["กล่อง", "ฉลาก", "สติกเกอร์"];
        const labelTypes = ["กล่อง&ซอง", "กล่องไปรษณีย์", "กล่องกระดาษ", "ฉลาก", "สติกเกอร์"];
        const matchedLabel = packagingItems.find(item => 
          (labelTypes.includes(item.type?.name) || labelKeywords.some(kw => item.name?.includes(kw)))
        );

        if (matchedBottle) {
          matchedBottle.currentQuantity = Math.max(0, matchedBottle.currentQuantity - qtyNeeded);
          await matchedBottle.save();
          console.log(\`Deducted \${qtyNeeded} units of bottle: \${matchedBottle.name}\`);
        }
        if (matchedCap) {
          matchedCap.currentQuantity = Math.max(0, matchedCap.currentQuantity - qtyNeeded);
          await matchedCap.save();
          console.log(\`Deducted \${qtyNeeded} units of cap: \${matchedCap.name}\`);
        }
        if (matchedLabel) {
          matchedLabel.currentQuantity = Math.max(0, matchedLabel.currentQuantity - qtyNeeded);
          await matchedLabel.save();
          console.log(\`Deducted \${qtyNeeded} units of label: \${matchedLabel.name}\`);
        }

        updateData.isStockDeducted = true;
      } catch (deductErr) {
        console.error("Packaging deduction failed:", deductErr);
      }
    }
`;

// Insert in PUT /orders/:id/status
const statusTarget = `    const updateData = { ...req.body };
    
    const originalOrder = await User.findOne(filter);
    if (!originalOrder) {
      return res.status(404).json({ message: "Production order not found or unauthorized." });
    }`;

const statusReplacement = `    const updateData = { ...req.body };
    
    const originalOrder = await User.findOne(filter);
    if (!originalOrder) {
      return res.status(404).json({ message: "Production order not found or unauthorized." });
    }
${deductionLogic}`;

code = code.replace(statusTarget, statusReplacement);

// Insert in PUT /orders/:id/step
// Let's modify the variable name in deductionLogic for step route: updateFields
const deductionLogicStep = deductionLogic.replace(/updateData/g, 'updateFields');

const stepTarget = `    const updateFields = { ...req.body };
    
    const originalOrder = await User.findOne(filter);
    if (!originalOrder) {
      return res.status(404).json({ message: "Production order not found or unauthorized." });
    }`;

const stepReplacement = `    const updateFields = { ...req.body };
    
    const originalOrder = await User.findOne(filter);
    if (!originalOrder) {
      return res.status(404).json({ message: "Production order not found or unauthorized." });
    }
${deductionLogicStep}`;

code = code.replace(stepTarget, stepReplacement);

fs.writeFileSync(path, code, 'utf8');
console.log("Successfully patched production.routes.js with packaging deduction logic!");
