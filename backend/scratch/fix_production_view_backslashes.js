import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/ProductionView.js';
let code = fs.readFileSync(path, 'utf8');

// Fix styling width backslashes
code = code.replace('style={{ width: \\`\\${percent}%\\` }}', 'style={{ width: `${percent}%` }}');

fs.writeFileSync(path, code, 'utf8');
console.log("Fixed backslashes in ProductionView.js style block!");
