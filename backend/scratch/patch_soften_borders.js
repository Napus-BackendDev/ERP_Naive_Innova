import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/ProductionView.js';
let code = fs.readFileSync(path, 'utf8');

// Normalize line endings
code = code.replace(/\r\n/g, '\n');

// Replace any instances of border-blue-150 with border-blue-200
code = code.replaceAll('border-blue-150', 'border-blue-200');

// Replace any instances of border-emerald-150 with border-emerald-200
code = code.replaceAll('border-emerald-150', 'border-emerald-200');

// Also check for the unassigned drag highlighted border class if any
code = code.replaceAll('border-blue-150', 'border-blue-200');

fs.writeFileSync(path, code, 'utf8');
console.log("Successfully softened borders to match theme!");
