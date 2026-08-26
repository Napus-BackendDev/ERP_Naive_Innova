import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/PackagingView.js';
let code = fs.readFileSync(path, 'utf8');

// Normalize line endings
code = code.replace(/\r\n/g, '\n');

// Target search input container
const targetSearchContainer = `              {/* Search Input with Green tinted background */}
                  <div className="relative flex-1 min-w-[240px]">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-green-600/70" />
                    <input
                      type="text"
                      placeholder="ค้นหาชื่อ หรือ SKU..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-4 py-2 bg-green-50/30 border border-green-100/70 rounded-xl text-xs outline-none text-slate-700 placeholder-slate-400 font-semibold shadow-3xs transition-all focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-100/50"
                    />
                  </div>`;

const replacementSearchContainer = `              {/* Search Input with soft gray background */}
                  <div className="relative w-56 sm:w-64">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="ค้นหาชื่อ หรือ SKU..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-4 py-2 bg-slate-100/60 border border-slate-200 rounded-xl text-xs outline-none text-slate-700 placeholder-slate-400 font-semibold shadow-3xs transition-all focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-100/50"
                    />
                  </div>`;

if (code.includes(targetSearchContainer)) {
  code = code.replace(targetSearchContainer, replacementSearchContainer);
  console.log("Search container resized to w-64 and styled with soft gray background successfully!");
} else {
  console.log("Search container NOT found!");
}

fs.writeFileSync(path, code, 'utf8');
console.log("Search patch complete!");
