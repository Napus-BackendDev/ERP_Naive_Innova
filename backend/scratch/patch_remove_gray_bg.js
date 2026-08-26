import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/ProductionView.js';
let code = fs.readFileSync(path, 'utf8');

// Replace the gray background styling classes with clean transparent ones
const targetDiv = `        {/* Embedded Filters and Search Row */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3.5 mb-5 bg-slate-50/50 p-3 rounded-xl border border-slate-100">`;

const replacementDiv = `        {/* Embedded Filters and Search Row */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3.5 mb-4">`;

code = code.replace(targetDiv, replacementDiv);

fs.writeFileSync(path, code, 'utf8');
console.log("Successfully removed gray background from the embedded filters row!");
