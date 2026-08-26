import fs from 'fs';

// 1. Patch frontend/src/app/admin/bom/page.js
const pagePath = 'C:/Users/asus/Desktop/naive/MES/frontend/src/app/admin/bom/page.js';
if (fs.existsSync(pagePath)) {
  let code = fs.readFileSync(pagePath, 'utf8').replace(/\r\n/g, '\n');
  
  // Replace ratio * p * 1000 with ratio * p
  code = code.replaceAll('const reqGram = ratio * p * 1000;', 'const reqGram = ratio * p;');
  
  fs.writeFileSync(pagePath, code, 'utf8');
  console.log("Successfully patched page.js calculations!");
}

// 2. Patch backend/src/features/bom/bom.routes.js
const routesPath = 'C:/Users/asus/Desktop/naive/MES/backend/src/features/bom/bom.routes.js';
if (fs.existsSync(routesPath)) {
  let code = fs.readFileSync(routesPath, 'utf8').replace(/\r\n/g, '\n');
  
  // Replace value * quantity with (value / 1000) * quantity
  code = code.replace(
    'need[ingredientName] = (need[ingredientName] || 0) + value * quantity;',
    'need[ingredientName] = (need[ingredientName] || 0) + (value / 1000) * quantity;'
  );

  // Replace text references of "กก." to "ก."
  code = code.replaceAll(' กก.', ' ก.');
  code = code.replaceAll('กิโลกรัม', 'กรัม');
  
  fs.writeFileSync(routesPath, code, 'utf8');
  console.log("Successfully patched bom.routes.js calculations and labels!");
}

// 3. Patch frontend/src/components/dashboard/BomCalculatorView.js
const viewPath = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/BomCalculatorView.js';
if (fs.existsSync(viewPath)) {
  let code = fs.readFileSync(viewPath, 'utf8').replace(/\r\n/g, '\n');

  // Replace (qtyPcs * sizeMl) / 1000 with (qtyPcs * sizeMl)
  code = code.replaceAll('const calculatedKg = (qtyPcs * sizeMl) / 1000;', 'const calculatedGrams = qtyPcs * sizeMl;');
  code = code.replaceAll('calculatedKg > 0 ? String(calculatedKg) : String(x.quantityKg || "150.0")', 'calculatedGrams > 0 ? String(calculatedGrams) : String(x.quantityGrams || "150000.0")');

  // Replace UI unit labels
  code = code.replace('ระบุจำนวนที่ต้องการผลิต (กก.) ต่อสูตร', 'ระบุจำนวนที่ต้องการผลิต (ก.) ต่อสูตร');
  code = code.replace('ระบุจำนวนที่ต้องการผลิต (กก.) ต่อสูตร', 'ระบุจำนวนที่ต้องการผลิต (ก.) ต่อสูตร');
  code = code.replace('กก. ต่อสูตร', 'ก. ต่อสูตร');
  code = code.replaceAll('pointer-events-none">กก.</span>', 'pointer-events-none">ก.</span>');
  code = code.replaceAll('ราคา / กิโลกรัม', 'ราคา / กรัม');
  code = code.replaceAll('ราคาต่อกิโลกรัม (บาท)', 'ราคาต่อกรัม (บาท)');
  code = code.replaceAll('(ก./กก.)', '(ก.)');

  // Replace in Stock Adjustment Drawer
  code = code.replace('`${ing.pricePerKg.toLocaleString()} บาท`', '`${(ing.pricePerKg / 1000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} บาท`');
  
  // Submit ingredient price per gram conversion (input is per gram, DB stores per kg = * 1000)
  code = code.replace('pricePerKg: parseFloat(ingPrice) || 0', 'pricePerKg: (parseFloat(ingPrice) || 0) * 1000');
  // Populate edit modal (DB stores per kg, UI displays per gram = / 1000)
  code = code.replace('setIngPrice(ing.pricePerKg || 0);', 'setIngPrice((ing.pricePerKg || 0) / 1000);');

  // Adjust Drawer labels
  code = code.replaceAll(' กก.</span>', ' ก.</span>');
  code = code.replaceAll('จำนวนที่ต้องการเพิ่ม (กก.)', 'จำนวนที่ต้องการเพิ่ม (ก.)');
  code = code.replaceAll('จำนวนที่ต้องการลด (กก.)', 'จำนวนที่ต้องการลด (ก.)');
  code = code.replaceAll('ระบุจำนวนกิโลกรัม เช่น 10.5', 'ระบุจำนวนกรัม เช่น 500');

  fs.writeFileSync(viewPath, code, 'utf8');
  console.log("Successfully patched BomCalculatorView.js units and labels!");
}
