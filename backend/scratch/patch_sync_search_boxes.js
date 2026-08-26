import fs from 'fs';

// 1. Patch PackagingView.js to change search width to max-w-md
const pkgPath = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/PackagingView.js';
let pkgCode = fs.readFileSync(pkgPath, 'utf8');
pkgCode = pkgCode.replace(/\r\n/g, '\n');

const targetPkgSearch = `                  {/* Search Input with soft gray background */}
                  <div className="relative w-56 sm:w-64">`;

const replacementPkgSearch = `                  {/* Search Input with soft gray background */}
                  <div className="relative flex-grow max-w-md">`;

if (pkgCode.includes(targetPkgSearch)) {
  pkgCode = pkgCode.replace(targetPkgSearch, replacementPkgSearch);
  console.log("PackagingView.js search width changed to max-w-md!");
} else {
  console.log("PackagingView.js target search container NOT found!");
}
fs.writeFileSync(pkgPath, pkgCode, 'utf8');


// 2. Patch ProductionView.js to change search color to soft gray (bg-slate-100/60) with transition and ring focus
const prodPath = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/ProductionView.js';
let prodCode = fs.readFileSync(prodPath, 'utf8');
prodCode = prodCode.replace(/\r\n/g, '\n');

const targetProdInput = `            <input
              type="text"
              placeholder="ค้นหาชื่อลูกค้า หรือแบรนด์..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-green-500 focus:ring-1 focus:ring-green-100 bg-white transition-all placeholder:text-slate-400 placeholder:font-medium"
            />`;

const replacementProdInput = `            <input
              type="text"
              placeholder="ค้นหาชื่อลูกค้า หรือแบรนด์..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-100/60 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-100/50 transition-all placeholder:text-slate-400 placeholder:font-medium"
            />`;

if (prodCode.includes(targetProdInput)) {
  prodCode = prodCode.replace(targetProdInput, replacementProdInput);
  console.log("ProductionView.js search styling updated to match Packaging soft gray theme!");
} else {
  console.log("ProductionView.js target search input NOT found!");
}
fs.writeFileSync(prodPath, prodCode, 'utf8');

console.log("All sync search boxes patched successfully!");
