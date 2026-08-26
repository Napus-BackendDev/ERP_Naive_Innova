import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/ProductionView.js';
let code = fs.readFileSync(path, 'utf8');

// 1. Correct the Left Card span and height (Line 604)
const targetLeftCard = `<Card className="lg:col-span-4 bg-white border border-slate-200 p-5 shadow-sm rounded-2xl flex flex-col gap-4 max-h-[380px]">`;
const replacementLeftCard = `<Card className="lg:col-span-6 bg-white border border-slate-200 p-5 shadow-sm rounded-2xl flex flex-col gap-4 h-[450px] overflow-hidden">`;

code = code.replace(targetLeftCard, replacementLeftCard);

// 2. Increase the left scroll container max height
const targetLeftScroll = `<div className="flex-grow overflow-y-auto pr-1 flex flex-col gap-2.5 max-h-[280px]">`;
const replacementLeftScroll = `<div className="flex-grow overflow-y-auto pr-1 flex flex-col gap-2.5 max-h-[325px]">`;

code = code.replace(targetLeftScroll, replacementLeftScroll);

fs.writeFileSync(path, code, 'utf8');
console.log("Successfully corrected left side layout to span 6 and set height to 450px!");
