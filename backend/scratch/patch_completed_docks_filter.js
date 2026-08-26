import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/ProductionView.js';
let code = fs.readFileSync(path, 'utf8');

// 1. Replace count logic to use completedCustomers.length
const targetCount = `                <span className="bg-emerald-100 text-emerald-700 text-[8px] px-1.5 py-0.2 rounded font-mono font-extrabold">
                  {orderedCustomers.filter(c => c.productionStatus === "completed" || c.productionStatus === "cust-confirmed").length} ใบสั่ง
                </span>`;

const replacementCount = `                <span className="bg-emerald-100 text-emerald-700 text-[8px] px-1.5 py-0.2 rounded font-mono font-extrabold">
                  {completedCustomers.length} ใบสั่ง
                </span>`;

code = code.replace(targetCount, replacementCount);

// 2. Replace the list mapping logic to use completedCustomers
const targetList = `              {/* Completed List */}
              <div className="flex-1 overflow-y-auto space-y-1 mt-1.5 pr-0.5 max-h-[105px]">
                {orderedCustomers.filter(c => c.productionStatus === "completed" || c.productionStatus === "cust-confirmed").length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center py-6">
                    <span className="text-[9px] text-slate-400 font-semibold italic">ยังไม่มีใบสั่งผลิตที่เสร็จสิ้น</span>
                  </div>
                ) : (
                  orderedCustomers.filter(c => c.productionStatus === "completed" || c.productionStatus === "cust-confirmed").map((cust) => {`;

const replacementList = `              {/* Completed List */}
              <div className="flex-1 overflow-y-auto space-y-1 mt-1.5 pr-0.5 max-h-[105px]">
                {completedCustomers.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center py-6">
                    <span className="text-[9px] text-slate-400 font-semibold italic">ยังไม่มีใบสั่งผลิตที่เสร็จสิ้น</span>
                  </div>
                ) : (
                  completedCustomers.map((cust) => {`;

code = code.replace(targetList, replacementList);

fs.writeFileSync(path, code, 'utf8');
console.log("Successfully aligned completed customers filter with local state!");
