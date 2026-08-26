import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/ProductionView.js';
let code = fs.readFileSync(path, 'utf8');

// Replace the max-w-3xl width with max-w-5xl to make the modal wider
code = code.replace(
  'max-w-3xl p-6 shadow-2xl relative',
  'max-w-5xl p-6 shadow-2xl relative'
);

fs.writeFileSync(path, code, 'utf8');
console.log("Successfully changed Add Machine modal width to max-w-5xl!");
