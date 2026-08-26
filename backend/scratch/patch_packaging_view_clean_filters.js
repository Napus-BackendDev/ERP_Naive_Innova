import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/PackagingView.js';
let code = fs.readFileSync(path, 'utf8');

// Normalize line endings
code = code.replace(/\r\n/g, '\n');

// Find the start of Table Header Section (which had 'คลังบรรจุภัณฑ์ปัจจุบัน' and the old filter layout)
const startHeaderToken = '{/* Table Header Section */}';
const startHeaderIndex = code.indexOf(startHeaderToken);

// Find the end of render only the active tab's table block (which is before Edit Packaging Modal popup)
const endTableToken = '{/* Edit Packaging Modal popup */}';
const endTableIndex = code.indexOf(endTableToken);

if (startHeaderIndex !== -1 && endTableIndex !== -1) {
  const beforePart = code.slice(0, startHeaderIndex);
  const afterPart = code.slice(endTableIndex);

  const newMainLayout = `{/* Table Header Section & Inline Filters Below Header Title */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-800 text-sm">คลังบรรจุภัณฑ์ปัจจุบัน</h3>
          <button 
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" /> เพิ่มบรรจุภัณฑ์
          </button>
        </div>

        {/* Dynamic Category Section with Filter Bar below the title */}
        {(() => {
          const packItems = sortedPackaging.filter(p => classifyItem(p) === "pack");
          const labelItems = sortedPackaging.filter(p => classifyItem(p) === "label");
          const postItems = sortedPackaging.filter(p => classifyItem(p) === "post");

          let activeTitle = "";
          let activeIcon = null;
          let activeCount = 0;
          let activeTableItems = [];
          let emptyMsg = "";

          if (activeTab === "pack") {
            activeTitle = "บรรจุภัณฑ์";
            activeIcon = <Package className="h-4.5 w-4.5 text-blue-600 shrink-0" />;
            activeCount = packItems.length;
            activeTableItems = packItems;
            emptyMsg = "ไม่พบข้อมูลบรรจุภัณฑ์";
          } else if (activeTab === "label") {
            activeTitle = "ฉลาก";
            activeIcon = <Tag className="h-4.5 w-4.5 text-purple-600 shrink-0" />;
            activeCount = labelItems.length;
            activeTableItems = labelItems;
            emptyMsg = "ไม่พบข้อมูลฉลาก";
          } else if (activeTab === "post") {
            activeTitle = "ไปรษณีย์";
            activeIcon = <Mail className="h-4.5 w-4.5 text-indigo-600 shrink-0" />;
            activeCount = postItems.length;
            activeTableItems = postItems;
            emptyMsg = "ไม่พบข้อมูลกล่องไปรษณีย์/ซอง";
          }

          return (
            <div className="space-y-4">
              {/* Dynamic Table Header Title */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  {activeIcon}
                  <h4 className="font-extrabold text-slate-800 text-[13px] uppercase tracking-wider text-left">
                    {activeTitle} ({activeCount} รายการ)
                  </h4>
                </div>
              </div>

              {/* Clean Filter Controls (No gray enclosing box) */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Search Input */}
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

                  {/* Customer Select */}
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

                  {/* Category Select */}
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

                  {/* Status Select */}
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
                  <div className="flex flex-wrap items-center gap-1.5 pt-2 text-left">
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

              {/* Data Table */}
              {renderPackagingTable(activeTableItems, emptyMsg)}
            </div>
          );
        })()}
      </div>

      `;

  code = beforePart + newMainLayout + afterPart;
  console.log("Successfully reorganized filters placement and styling!");
} else {
  console.log("Required indexes for replacement not found!");
}

fs.writeFileSync(path, code, 'utf8');
console.log("Patch complete!");
