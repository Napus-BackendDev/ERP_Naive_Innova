import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/ProductionView.js';
let code = fs.readFileSync(path, 'utf8');

// 1. Replace Left Card span and height to col-span-12 and h-[400px]
const targetLeftCard = `<Card className="lg:col-span-6 bg-white border border-slate-200 p-5 shadow-sm rounded-2xl flex flex-col gap-4 h-[450px] overflow-hidden">`;
const replacementLeftCard = `<Card className="col-span-12 bg-white border border-slate-200 p-5 shadow-sm rounded-2xl flex flex-col gap-4 h-[400px] overflow-hidden">`;

code = code.replace(targetLeftCard, replacementLeftCard);

// 2. Adjust Left Scroll Container max height to match h-[400px]
const targetLeftScroll = `<div className="flex-grow overflow-y-auto pr-1 flex flex-col gap-2.5 max-h-[325px]">`;
const replacementLeftScroll = `<div className="flex-grow overflow-y-auto pr-1 flex flex-col gap-2.5 max-h-[280px]">`;

code = code.replace(targetLeftScroll, replacementLeftScroll);

// 3. Replace Right Card span and height to col-span-12 and h-[400px]
const targetRightCard = `<Card className="lg:col-span-6 bg-white border border-slate-200 p-5 shadow-sm rounded-2xl flex flex-col gap-4 h-[450px] overflow-hidden">`;
const replacementRightCard = `<Card className="col-span-12 bg-white border border-slate-200 p-5 shadow-sm rounded-2xl flex flex-col gap-4 h-[400px] overflow-hidden">`;

code = code.replace(targetRightCard, replacementRightCard);

// 4. Adjust Right Scroll Container max height to match h-[400px]
const targetRightScroll = `<div className="flex flex-col gap-4 overflow-y-auto pr-1.5 mt-2 flex-1 min-h-0 max-h-[315px]">`;
const replacementRightScroll = `<div className="flex flex-col gap-4 overflow-y-auto pr-1.5 mt-2 flex-1 min-h-0 max-h-[280px]">`;

code = code.replace(targetRightScroll, replacementRightScroll);

fs.writeFileSync(path, code, 'utf8');
console.log("Successfully updated dashboard to 1 column, 2 rows layout!");
