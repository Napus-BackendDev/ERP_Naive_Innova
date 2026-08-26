import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/PackagingView.js';
let code = fs.readFileSync(path, 'utf8');

// Normalize line endings
code = code.replace(/\r\n/g, '\n');

// Find the start of filter panel
const startText = '{/* Filter Panel (Always visible) */}';
const startIndex = code.indexOf(startText);

if (startIndex !== -1) {
  // Find the closing </div> of the filter panel, which is right before {/* Render only the active tab's table */}
  const endText = '{/* Render only the active tab\'s table */}';
  const endIndex = code.indexOf(endText);

  if (endIndex !== -1) {
    const beforePart = code.slice(0, startIndex);
    const afterPart = code.slice(endIndex);

    const optionAFilters = `{/* Filter Panel (Always visible - Option A: Horizontal + Chips) */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            {/* Filter controls row */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Search Box */}
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อ หรือ SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none text-slate-700 focus:border-green-500 placeholder-slate-400 font-semibold shadow-3xs"
                />
              </div>

              {/* Customer select */}
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="p-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none text-slate-700 focus:border-green-500 font-semibold shadow-3xs cursor-pointer min-w-[160px]"
              >
                <option value="ทั้งหมด">แบรนด์ลูกค้า: ทั้งหมด</option>
                {activeBrands.map(brandName => (
                  <option key={brandName} value={brandName}>
                    {brandName === "ระบบ" ? "ระบบ (System)" : brandName === "กลาง" ? "กลาง (General)" : brandName} ({brandCounts[brandName] || 0})
                  </option>
                ))}
              </select>

              {/* Category select */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="p-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none text-slate-700 focus:border-green-500 font-semibold shadow-3xs cursor-pointer min-w-[160px]"
              >
                <option value="ทั้งหมด">หมวดหมู่: ทั้งหมด</option>
                {activeCategories.map(cat => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name} ({categoryCounts[cat._id.toString()] || 0})
                  </option>
                ))}
              </select>

              {/* Status select */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="p-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none text-slate-700 focus:border-green-500 font-semibold shadow-3xs cursor-pointer min-w-[140px]"
              >
                <option value="ทั้งหมด">สถานะสต็อก: ทั้งหมด</option>
                <option value="ปกติ">ปกติ ({activeTabItems.filter(p => p.currentQuantity >= 500).length})</option>
                <option value="สต็อกใกล้หมด">สต็อกใกล้หมด ({activeTabItems.filter(p => p.currentQuantity > 0 && p.currentQuantity < 500).length})</option>
                <option value="สินค้าหมด">สินค้าหมด ({activeTabItems.filter(p => p.currentQuantity === 0).length})</option>
              </select>
            </div>

            {/* Active Filter Chips */}
            {(selectedCustomer !== "ทั้งหมด" || selectedCategory !== "ทั้งหมด" || selectedStatus !== "ทั้งหมด" || searchTerm !== "") && (
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-left">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mr-1">กำลังกรองข้อมูล:</span>
                
                {selectedCustomer !== "ทั้งหมด" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-bold shadow-3xs">
                    แบรนด์: {selectedCustomer === "ระบบ" ? "ระบบ (System)" : selectedCustomer === "กลาง" ? "กลาง (General)" : selectedCustomer}
                    <button
                      type="button"
                      onClick={() => setSelectedCustomer("ทั้งหมด")}
                      className="hover:text-red-500 transition-colors cursor-pointer text-green-500 font-black ml-1.5"
                    >
                      ✕
                    </button>
                  </span>
                )}

                {selectedCategory !== "ทั้งหมด" && (() => {
                  const activeCatObj = activeCategories.find(c => c._id === selectedCategory);
                  const catName = activeCatObj ? activeCatObj.name : selectedCategory;
                  return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-bold shadow-3xs">
                      หมวดหมู่: {catName}
                      <button
                        type="button"
                        onClick={() => setSelectedCategory("ทั้งหมด")}
                        className="hover:text-red-500 transition-colors cursor-pointer text-green-500 font-black ml-1.5"
                      >
                        ✕
                      </button>
                    </span>
                  );
                })()}

                {selectedStatus !== "ทั้งหมด" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-bold shadow-3xs">
                    สถานะ: {selectedStatus}
                    <button
                      type="button"
                      onClick={() => setSelectedStatus("ทั้งหมด")}
                      className="hover:text-red-500 transition-colors cursor-pointer text-green-500 font-black ml-1.5"
                    >
                      ✕
                    </button>
                  </span>
                )}

                {searchTerm !== "" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-bold shadow-3xs">
                    คำค้นหา: "{searchTerm}"
                    <button
                      type="button"
                      onClick={() => setSearchTerm("")}
                      className="hover:text-red-500 transition-colors cursor-pointer text-green-500 font-black ml-1.5"
                    >
                      ✕
                    </button>
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomer("ทั้งหมด");
                    setSelectedCategory("ทั้งหมด");
                    setSelectedStatus("ทั้งหมด");
                    setSearchTerm("");
                  }}
                  className="px-2.5 py-1 text-red-600 hover:text-red-700 text-xs font-black transition-colors cursor-pointer ml-auto"
                >
                  ล้างตัวกรองทั้งหมด
                </button>
              </div>
            )}
          </div>
        </div>
        
        `;

    code = beforePart + optionAFilters + afterPart;
    console.log("Successfully replaced filter panel with Option A!");
  } else {
    console.log("End text NOT found!");
  }
} else {
  console.log("Start text NOT found!");
}

fs.writeFileSync(path, code, 'utf8');
console.log("Option A patch completed successfully!");
