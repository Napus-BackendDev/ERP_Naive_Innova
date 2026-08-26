import fs from 'fs';

// 1. Patch ProductionDetailView.js
const detailPath = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/ProductionDetailView.js';
let detailCode = fs.readFileSync(detailPath, 'utf8');

detailCode = detailCode.replace('productionStatus: "กำลังผลิต (บรรจุ)"', 'productionStatus: "กำลังผลิต"');
detailCode = detailCode.replace('productionStatus: "กำลังผลิต (ติดฉลาก)"', 'productionStatus: "กำลังผลิต"');

fs.writeFileSync(detailPath, detailCode, 'utf8');
console.log("Patched ProductionDetailView.js status steps successfully!");

// 2. Patch ProductionView.js
const viewPath = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/ProductionView.js';
let viewCode = fs.readFileSync(viewPath, 'utf8');

// Replace dropdown options
viewCode = viewCode.replace(
  `<option value="กำลังผลิต (บรรจุ)">กำลังผลิต (บรรจุภัณฑ์)</option>\n                  <option value="กำลังผลิต (ติดฉลาก)">กำลังผลิต (ติดฉลาก & ห่อหุ้ม)</option>`,
  `<option value="กำลังผลิต">กำลังผลิต</option>`
);

// Replace status setter cases
const oldCases = `} else if (newStatus === "กำลังผลิต (ติดฉลาก)") {
        payload.productionStep = 4;
      } else if (newStatus === "กำลังผลิต (บรรจุ)") {
        payload.productionStep = 3;`;
const newCases = `} else if (newStatus === "กำลังผลิต" || newStatus === "กำลังผลิต (บรรจุ)" || newStatus === "กำลังผลิต (ติดฉลาก)") {
        payload.productionStep = 3;`;

viewCode = viewCode.replace(oldCases, newCases);

// Replace renderStatusBadge mapping
const oldBadge = `    if (status === "กำลังผลิต (บรรจุ)" || status === "กำลังผลิต") {
      return (
        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-[10px] font-bold">
          กำลังบรรจุและติดฉลาก
        </span>
      );
    }`;

const newBadge = `    if (status === "กำลังผลิต" || status === "กำลังผลิต (บรรจุ)" || status === "กำลังผลิต (ติดฉลาก)") {
      return (
        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-[10px] font-bold">
          กำลังผลิต
        </span>
      );
    }`;

viewCode = viewCode.replace(oldBadge, newBadge);

fs.writeFileSync(viewPath, viewCode, 'utf8');
console.log("Patched ProductionView.js dropdown and badges successfully!");
