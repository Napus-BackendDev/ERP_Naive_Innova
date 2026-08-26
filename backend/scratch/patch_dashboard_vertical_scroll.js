import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/ProductionView.js';
let code = fs.readFileSync(path, 'utf8');

// 1. Replace the machine container with a vertical flexbox (overflow-y-auto, max-h-[310px])
const targetMachinesContainer = `<div className="flex flex-row gap-4 overflow-x-auto pb-3 pr-1 mt-2 flex-1 min-h-0">`;
const replacementMachinesContainer = `<div className="flex flex-col gap-4 overflow-y-auto pr-1.5 mt-2 flex-1 min-h-0 max-h-[315px]">`;

code = code.replace(targetMachinesContainer, replacementMachinesContainer);

// 2. Change the machine card item to w-full so they stack vertically and span full width
const targetMachineCardItem = `                  <div key={mach.id} className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl flex flex-col justify-between gap-3 relative hover:bg-slate-100/30 transition-all min-w-[280px] shrink-0">`;
const replacementMachineCardItem = `                  <div key={mach.id} className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl flex flex-col justify-between gap-3 relative hover:bg-slate-100/30 transition-all w-full shrink-0">`;

code = code.replace(targetMachineCardItem, replacementMachineCardItem);

fs.writeFileSync(path, code, 'utf8');
code = fs.readFileSync(path, 'utf8');

// Let's do a backup check: check if it contains the target code
if (code.includes('max-h-[315px]')) {
  console.log("Successfully adjusted machines listing to vertical scrolling format!");
} else {
  console.log("Failed to locate machines container, trying alternative replace...");
}
