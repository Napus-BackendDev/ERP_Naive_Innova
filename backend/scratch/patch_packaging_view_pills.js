import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/PackagingView.js';
let code = fs.readFileSync(path, 'utf8');

// Normalize line endings
code = code.replace(/\r\n/g, '\n');

// 1. Calculate the active brand, category counts and arrays at the top of the component render body (after activeTab state, before filteredPackaging logic)
const targetComponentBodyStart = `  const [activeTab, setActiveTab] = useState("pack"); // "pack", "label", "post"

  // Modal states
  const [editModalOpen, setEditModalOpen] = useState(false);`;

const replacementComponentBodyStart = `  const [activeTab, setActiveTab] = useState("pack"); // "pack", "label", "post"

  // Modal states
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Compute active tab items and their brand/category list counts dynamically
  const activeTabItems = packaging.filter(p => classifyItem(p) === activeTab);

  const activeBrands = Array.from(new Set(activeTabItems.map(p => p.customer || "ใช้ร่วมกัน"))).sort();
  const brandCounts = {};
  activeTabItems.forEach(p => {
    const b = p.customer || "ใช้ร่วมกัน";
    brandCounts[b] = (brandCounts[b] || 0) + 1;
  });

  const activeCategoriesMap = {};
  activeTabItems.forEach(p => {
    if (pkg => true) {
      const typeObj = p.type;
      if (typeObj && typeObj._id) {
        activeCategoriesMap[typeObj._id.toString()] = typeObj;
      }
    }
  });
  const activeCategories = Object.values(activeCategoriesMap);
  const categoryCounts = {};
  activeTabItems.forEach(p => {
    if (p.type && p.type._id) {
      const cid = p.type._id.toString();
      categoryCounts[cid] = (categoryCounts[cid] || 0) + 1;
    }
  });`;

if (code.includes(targetComponentBodyStart)) {
  code = code.replace(targetComponentBodyStart, replacementComponentBodyStart);
  console.log("Pills count variables added successfully!");
} else {
  console.log("Pills count variables NOT added!");
}

// 2. Update matchesCustomer in filteredPackaging to support "ใช้ร่วมกัน"
const targetMatchesCustomer = `    const matchesCustomer = selectedCustomer === "ทั้งหมด" || pkg.customer === selectedCustomer;`;
const replacementMatchesCustomer = `    const matchesCustomer = selectedCustomer === "ทั้งหมด" || (pkg.customer || "ใช้ร่วมกัน") === selectedCustomer;`;

if (code.includes(targetMatchesCustomer)) {
  code = code.replace(targetMatchesCustomer, replacementMatchesCustomer);
  console.log("matchesCustomer condition updated!");
}

// 3. Replace the entire filter panel with the new Pills UI (from '{/* Filter Panel (Always visible) */}' to its end tag)
const targetFilterPanel = `           {/* Filter Panel (Always visible) */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 transition-all duration-200">
               {/* Text Search */}
               <div className="relative">
                 <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                 <input
                   type="text"
                   placeholder="ค้นหาชื่อ หรือ SKU..."
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="pl-8 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none text-slate-700 focus:border-green-500 placeholder-slate-400 font-semibold w-48 sm:w-56 shadow-2xs"
                 />
               </div>
 
               {/* Customer Select */}
               <select
                 value={selectedCustomer}
                 onChange={(e) => setSelectedCustomer(e.target.value)}
                 className="p-2 bg-white border border-slate-200 rounded-xl text-xs outline-none text-slate-700 focus:border-green-500 font-semibold shadow-2xs cursor-pointer"
               >
                 <option value="ทั้งหมด">แบรนด์ลูกค้า: ทั้งหมด</option>
                 {uniqueBrands.map(brandName => (
                   <option key={brandName} value={brandName}>
                     {brandName === "ระบบ" ? "ระบบ (System)" : brandName === "กลาง" ? "กลาง (General)" : brandName}
                   </option>
                 ))}
               </select>
 
               {/* Category Select */}
               <select
                 value={selectedCategory}
                 onChange={(e) => setSelectedCategory(e.target.value)}
                 className="p-2 bg-white border border-slate-200 rounded-xl text-xs outline-none text-slate-700 focus:border-green-500 font-semibold shadow-2xs cursor-pointer"
               >
                 <option value="ทั้งหมด">หมวดหมู่: ทั้งหมด</option>
                 {categories.map(cat => (
                   <option key={cat._id} value={cat._id}>{cat.name}</option>
                 ))}
               </select>
 
               {/* Status Select */}
               <select
                 value={selectedStatus}
                 onChange={(e) => setSelectedStatus(e.target.value)}
                 className="p-2 bg-white border border-slate-200 rounded-xl text-xs outline-none text-slate-700 focus:border-green-500 font-semibold shadow-2xs cursor-pointer"
               >
                 <option value="ทั้งหมด">สถานะสต็อก: ทั้งหมด</option>
                 <option value="ปกติ">ปกติ</option>
                 <option value="สต็อกใกล้หมด">สต็อกใกล้หมด</option>
                 <option value="สินค้าหมด">สินค้าหมด</option>
               </select>
 
               {/* Reset Filters Button */}
               {(selectedCustomer !== "ทั้งหมด" || selectedCategory !== "ทั้งหมด" || selectedStatus !== "ทั้งหมด" || searchTerm !== "") && (
                 <button
                   onClick={() => {
                     setSelectedCustomer("ทั้งหมด");
                     setSelectedCategory("ทั้งหมด");
                     setSelectedStatus("ทั้งหมด");
                     setSearchTerm("");
                   }}
                   className="px-3 py-2 text-red-600 hover:text-red-700 text-xs font-bold transition-colors cursor-pointer"
                 >
                   ล้างตัวกรอง
                 </button>
               )}
             </div>`;

const replacementFilterPanel = `          {/* Filter Panel (Always visible) */}
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
          </div>`;

if (code.includes(targetFilterPanel)) {
  code = code.replace(targetFilterPanel, replacementFilterPanel);
  console.log("Filter Panel updated to Pills UI!");
} else {
  console.log("Filter Panel NOT updated!");
}

fs.writeFileSync(path, code, 'utf8');
console.log("Successfully patched pills selection filters in PackagingView.js!");
