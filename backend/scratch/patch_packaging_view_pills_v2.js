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
    // We want to replace everything from the startText to the divider before endText
    const beforePart = code.slice(0, startIndex);
    const afterPart = code.slice(endIndex);

    const newFilterPanel = `{/* Filter Panel (Always visible) */}
          <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            {/* Row 1: แบรนด์ลูกค้า */}
            <div className="flex flex-col gap-1.5 text-left">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">แบรนด์ลูกค้า (Customer Brands)</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedCustomer("ทั้งหมด")}
                  className={"px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border " + (selectedCustomer === "ทั้งหมด" ? "bg-green-600 text-white border-green-600 shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50")}
                >
                  ทั้งหมด ({activeTabItems.length})
                </button>
                {activeBrands.map(brandName => {
                  const count = brandCounts[brandName] || 0;
                  return (
                    <button
                      key={brandName}
                      type="button"
                      onClick={() => setSelectedCustomer(brandName)}
                      className={"px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border " + (selectedCustomer === brandName ? "bg-green-600 text-white border-green-600 shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50")}
                    >
                      {brandName === "ระบบ" ? "ระบบ" : brandName === "กลาง" ? "กลาง" : brandName} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Row 2: หมวดหมู่ */}
            <div className="flex flex-col gap-1.5 text-left">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">หมวดหมู่บรรจุภัณฑ์ (Categories)</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedCategory("ทั้งหมด")}
                  className={"px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border " + (selectedCategory === "ทั้งหมด" ? "bg-green-600 text-white border-green-600 shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50")}
                >
                  ทั้งหมด ({activeTabItems.length})
                </button>
                {activeCategories.map(cat => {
                  const count = categoryCounts[cat._id.toString()] || 0;
                  return (
                    <button
                      key={cat._id}
                      type="button"
                      onClick={() => setSelectedCategory(cat._id)}
                      className={"px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border " + (selectedCategory === cat._id ? "bg-green-600 text-white border-green-600 shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50")}
                    >
                      {cat.name} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Row 3: ค้นหา และ สถานะสต็อก */}
            <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-100">
              {/* Search Input Box */}
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อ หรือ SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none text-slate-700 focus:border-green-500 placeholder-slate-400 font-semibold shadow-2xs"
                />
              </div>

              {/* Stock Status Pills */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mr-1">สถานะ:</span>
                <div className="flex gap-1.5">
                  {["ทั้งหมด", "ปกติ", "สต็อกใกล้หมด", "สินค้าหมด"].map(status => {
                    let statusCount = 0;
                    if (status === "ทั้งหมด") {
                      statusCount = activeTabItems.length;
                    } else if (status === "ปกติ") {
                      statusCount = activeTabItems.filter(p => p.currentQuantity >= 500).length;
                    } else if (status === "สต็อกใกล้หมด") {
                      statusCount = activeTabItems.filter(p => p.currentQuantity > 0 && p.currentQuantity < 500).length;
                    } else if (status === "สินค้าหมด") {
                      statusCount = activeTabItems.filter(p => p.currentQuantity === 0).length;
                    }

                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setSelectedStatus(status)}
                        className={"px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer border " + (selectedStatus === status ? "bg-green-600 text-white border-green-600 shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50")}
                      >
                        {status} ({statusCount})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Reset Filters */}
              {(selectedCustomer !== "ทั้งหมด" || selectedCategory !== "ทั้งหมด" || selectedStatus !== "ทั้งหมด" || searchTerm !== "") && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomer("ทั้งหมด");
                    setSelectedCategory("ทั้งหมด");
                    setSelectedStatus("ทั้งหมด");
                    setSearchTerm("");
                  }}
                  className="px-3 py-2 text-red-600 hover:text-red-700 text-xs font-black transition-colors cursor-pointer ml-auto"
                >
                  ล้างตัวกรอง
                </button>
              )}
            </div>
          </div>
        </div>
        
        `;

    code = beforePart + newFilterPanel + afterPart;
    console.log("Successfully replaced filter panel using slicing!");
  } else {
    console.log("End text NOT found!");
  }
} else {
  console.log("Start text NOT found!");
}

fs.writeFileSync(path, code, 'utf8');
console.log("Completed v2 patch successfully!");
