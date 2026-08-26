import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/ProductionView.js';
let code = fs.readFileSync(path, 'utf8');

// 1. Replace the Grid container columns to 50/50 split (col-span-6 for left, col-span-6 for right)
const targetLeftCard = `<Card className="lg:col-span-4 bg-white border border-slate-200 p-5 shadow-sm rounded-2xl flex flex-col justify-between h-[450px]">`;
const replacementLeftCard = `<Card className="lg:col-span-6 bg-white border border-slate-200 p-5 shadow-sm rounded-2xl flex flex-col justify-between h-[450px]">`;

code = code.replace(targetLeftCard, replacementLeftCard);

const targetRightCard = `<Card className="lg:col-span-8 bg-white border border-slate-200 p-5 shadow-sm rounded-2xl flex flex-col gap-4">`;
const replacementRightCard = `<Card className="lg:col-span-6 bg-white border border-slate-200 p-5 shadow-sm rounded-2xl flex flex-col gap-4 h-[450px] overflow-hidden">`;

code = code.replace(targetRightCard, replacementRightCard);

// 2. Change the machine cards container to a single row flexbox (overflow-x-auto instead of wrapping grid)
const targetMachinesContainer = `<div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto max-h-[300px] pr-1 mt-2">`;
const replacementMachinesContainer = `<div className="flex flex-row gap-4 overflow-x-auto pb-3 pr-1 mt-2 flex-1 min-h-0">`;

code = code.replace(targetMachinesContainer, replacementMachinesContainer);

// 3. Make each machine card have a minimum width and flex-shrink-0 so they line up in one row without wrapping
const targetMachineCardItem = `                return (
                  <div key={mach.id} className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl flex flex-col justify-between gap-3 relative hover:bg-slate-100/30 transition-all">`;

const replacementMachineCardItem = `                return (
                  <div key={mach.id} className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl flex flex-col justify-between gap-3 relative hover:bg-slate-100/30 transition-all min-w-[280px] shrink-0">`;

code = code.replace(targetMachineCardItem, replacementMachineCardItem);

fs.writeFileSync(path, code, 'utf8');
console.log("Successfully adjusted dashboard layout to 50/50 split and single horizontal machine row!");
