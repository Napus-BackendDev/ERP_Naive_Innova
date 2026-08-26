import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/PackagingView.js';
let code = fs.readFileSync(path, 'utf8');

// Normalize line endings
code = code.replace(/\r\n/g, '\n');

// Replace the border-b line under category title
const targetTitleContainer = `              {/* Dynamic Table Header Title */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">`;

const replacementTitleContainer = `              {/* Dynamic Table Header Title */}
              <div className="flex items-center justify-between pb-1.5">`;

if (code.includes(targetTitleContainer)) {
  code = code.replace(targetTitleContainer, replacementTitleContainer);
  console.log("Category title horizontal border-b line removed successfully!");
} else {
  console.log("Category title container NOT found!");
}

fs.writeFileSync(path, code, 'utf8');
console.log("Completed!");
