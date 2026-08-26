import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/PackagingView.js';
let code = fs.readFileSync(path, 'utf8');

// Normalize line endings
code = code.replace(/\r\n/g, '\n');

// Target the filter row block
const targetFilterBlock = `              {/* Clean Filter Controls (No gray enclosing box) */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Search Input with soft gray background */}
                  <div className="relative w-56 sm:w-64">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="ค้นหาชื่อ หรือ SKU..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-4 py-2 bg-slate-100/60 border border-slate-200 rounded-xl text-xs outline-none text-slate-700 placeholder-slate-400 font-semibold shadow-3xs transition-all focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-100/50"
                    />
                  </div>

                  {/* Custom Customer Select */}
                  <div className="w-[180px]">
                    <SearchableSelect
                      options={[
                        { label: "ทั้งหมด", value: "ทั้งหมด" },
                        ...activeBrands.map(brandName => ({
                          label: \`\${brandName === "ระบบ" ? "ระบบ" : brandName === "กลาง" ? "กลาง" : brandName} (\${brandCounts[brandName] || 0})\`,
                          value: brandName
                        }))
                      ]}
                      value={selectedCustomer}
                      onChange={setSelectedCustomer}
                      placeholder="ทั้งหมด"
                      searchable={activeBrands.length > 5}
                      prefix="ลูกค้า"
                    />
                  </div>

                  {/* Custom Category Select */}
                  <div className="w-[180px]">
                    <SearchableSelect
                      options={[
                        { label: "ทั้งหมด", value: "ทั้งหมด" },
                        ...activeCategories.map(cat => ({
                          label: \`\${cat.name} (\${categoryCounts[cat._id.toString()] || 0})\`,
                          value: cat._id
                        }))
                      ]}
                      value={selectedCategory}
                      onChange={setSelectedCategory}
                      placeholder="ทั้งหมด"
                      searchable={activeCategories.length > 5}
                      prefix="หมวดหมู่"
                    />
                  </div>

                  {/* Custom Status Select */}
                  <div className="w-[160px]">
                    <SearchableSelect
                      options={[
                        { label: "ทั้งหมด", value: "ทั้งหมด" },
                        { label: \`ปกติ (\${activeTabItems.filter(p => p.currentQuantity >= 500).length})\`, value: "ปกติ" },
                        { label: \`สต็อกใกล้หมด (\${activeTabItems.filter(p => p.currentQuantity > 0 && p.currentQuantity < 500).length})\`, value: "สต็อกใกล้หมด" },
                        { label: \`สินค้าหมด (\${activeTabItems.filter(p => p.currentQuantity === 0).length})\`, value: "สินค้าหมด" }
                      ]}
                      value={selectedStatus}
                      onChange={setSelectedStatus}
                      placeholder="ทั้งหมด"
                      searchable={false}
                      prefix="สถานะ"
                    />
                  </div>
                </div>`;

const replacementFilterBlock = `              {/* Clean Filter Controls (No gray enclosing box) */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {/* Search Input with soft gray background (Left aligned) */}
                  <div className="relative w-56 sm:w-64">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="ค้นหาชื่อ หรือ SKU..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-4 py-2 bg-slate-100/60 border border-slate-200 rounded-xl text-xs outline-none text-slate-700 placeholder-slate-400 font-semibold shadow-3xs transition-all focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-100/50"
                    />
                  </div>

                  {/* Dropdowns aligned to the far right */}
                  <div className="flex flex-wrap items-center gap-3 sm:ml-auto">
                    {/* Custom Customer Select */}
                    <div className="w-[180px]">
                      <SearchableSelect
                        options={[
                          { label: "ทั้งหมด", value: "ทั้งหมด" },
                          ...activeBrands.map(brandName => ({
                            label: \`\${brandName === "ระบบ" ? "ระบบ" : brandName === "กลาง" ? "กลาง" : brandName} (\${brandCounts[brandName] || 0})\`,
                            value: brandName
                          }))
                        ]}
                        value={selectedCustomer}
                        onChange={setSelectedCustomer}
                        placeholder="ทั้งหมด"
                        searchable={activeBrands.length > 5}
                        prefix="ลูกค้า"
                      />
                    </div>

                    {/* Custom Category Select */}
                    <div className="w-[180px]">
                      <SearchableSelect
                        options={[
                          { label: "ทั้งหมด", value: "ทั้งหมด" },
                          ...activeCategories.map(cat => ({
                            label: \`\${cat.name} (\${categoryCounts[cat._id.toString()] || 0})\`,
                            value: cat._id
                          }))
                        ]}
                        value={selectedCategory}
                        onChange={setSelectedCategory}
                        placeholder="ทั้งหมด"
                        searchable={activeCategories.length > 5}
                        prefix="หมวดหมู่"
                      />
                    </div>

                    {/* Custom Status Select */}
                    <div className="w-[160px]">
                      <SearchableSelect
                        options={[
                          { label: "ทั้งหมด", value: "ทั้งหมด" },
                          { label: \`ปกติ (\${activeTabItems.filter(p => p.currentQuantity >= 500).length})\`, value: "ปกติ" },
                          { label: \`สต็อกใกล้หมด (\${activeTabItems.filter(p => p.currentQuantity > 0 && p.currentQuantity < 500).length})\`, value: "สต็อกใกล้หมด" },
                          { label: \`สินค้าหมด (\${activeTabItems.filter(p => p.currentQuantity === 0).length})\`, value: "สินค้าหมด" }
                        ]}
                        value={selectedStatus}
                        onChange={setSelectedStatus}
                        placeholder="ทั้งหมด"
                        searchable={false}
                        prefix="สถานะ"
                      />
                    </div>
                  </div>
                </div>`;

if (code.includes(targetFilterBlock)) {
  code = code.replace(targetFilterBlock, replacementFilterBlock);
  console.log("Dropdowns aligned to the far right successfully!");
} else {
  console.log("Target filter block NOT found!");
}

fs.writeFileSync(path, code, 'utf8');
console.log("Done!");
