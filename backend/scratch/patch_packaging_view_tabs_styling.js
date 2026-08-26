import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/PackagingView.js';
let code = fs.readFileSync(path, 'utf8');

// Normalize line endings
code = code.replace(/\r\n/g, '\n');

// 1. Update tab buttons layout (stretch full width w-full and flex-1)
const targetTabs = `      {/* Clickable Tabs (ระหว่าง Widget Bar และ Data Table) */}
      <div className="flex gap-2 self-start bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs">
        <button
          type="button"
          onClick={() => setActiveTab("pack")}
          className={"flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer " + (activeTab === "pack" ? "bg-green-600 text-white shadow-md shadow-green-100" : "text-slate-600 hover:bg-slate-50 hover:text-slate-800")}
        >
          <Package className="h-4 w-4 shrink-0" />
          บรรจุภัณฑ์ ({packaging.filter(p => classifyItem(p) === "pack").length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("label")}
          className={"flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer " + (activeTab === "label" ? "bg-green-600 text-white shadow-md shadow-green-100" : "text-slate-600 hover:bg-slate-50 hover:text-slate-800")}
        >
          <Tag className="h-4 w-4 shrink-0" />
          ฉลาก ({packaging.filter(p => classifyItem(p) === "label").length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("post")}
          className={"flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer " + (activeTab === "post" ? "bg-green-600 text-white shadow-md shadow-green-100" : "text-slate-600 hover:bg-slate-50 hover:text-slate-800")}
        >
          <Mail className="h-4 w-4 shrink-0" />
          ไปรษณีย์ ({packaging.filter(p => classifyItem(p) === "post").length})
        </button>
      </div>`;

const replacementTabs = `      {/* Clickable Tabs (ระหว่าง Widget Bar และ Data Table) */}
      <div className="flex gap-2 w-full bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs">
        <button
          type="button"
          onClick={() => setActiveTab("pack")}
          className={"flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer " + (activeTab === "pack" ? "bg-green-600 text-white shadow-md shadow-green-100" : "text-slate-600 hover:bg-slate-50 hover:text-slate-800")}
        >
          <Package className="h-4 w-4 shrink-0" />
          บรรจุภัณฑ์ ({packaging.filter(p => classifyItem(p) === "pack").length} รายการ)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("label")}
          className={"flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer " + (activeTab === "label" ? "bg-green-600 text-white shadow-md shadow-green-100" : "text-slate-600 hover:bg-slate-50 hover:text-slate-800")}
        >
          <Tag className="h-4 w-4 shrink-0" />
          ฉลาก ({packaging.filter(p => classifyItem(p) === "label").length} รายการ)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("post")}
          className={"flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer " + (activeTab === "post" ? "bg-green-600 text-white shadow-md shadow-green-100" : "text-slate-600 hover:bg-slate-50 hover:text-slate-800")}
        >
          <Mail className="h-4 w-4 shrink-0" />
          ไปรษณีย์ ({packaging.filter(p => classifyItem(p) === "post").length} รายการ)
        </button>
      </div>`;

if (code.includes(targetTabs)) {
  code = code.replace(targetTabs, replacementTabs);
  console.log("Tab buttons layout updated!");
} else {
  console.log("Tab buttons layout NOT found!");
}

// 2. Make Filter Panel always visible and remove the toggle button
const targetFilterBlock = `        {/* Table Header Section */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-sm">คลังบรรจุภัณฑ์ปัจจุบัน</h3>
            <div className="flex gap-2">
              <button 
                onClick={() => setFilterOpen(!filterOpen)}
                className={\`flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-xs font-semibold cursor-pointer transition-all \${
                  filterOpen || selectedCustomer !== "ทั้งหมด" || selectedCategory !== "ทั้งหมด" || selectedStatus !== "ทั้งหมด" || searchTerm !== ""
                    ? "border-green-500 bg-green-50 text-green-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }\`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" /> 
                {filterOpen ? "ปิดตัวกรอง" : "ตัวกรอง"}
                {(selectedCustomer !== "ทั้งหมด" || selectedCategory !== "ทั้งหมด" || selectedStatus !== "ทั้งหมด" || searchTerm !== "") && (
                  <span className="w-1.5 h-1.5 bg-green-600 rounded-full shrink-0" />
                )}
              </button>
              <button 
                onClick={() => setCreateModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" /> เพิ่มบรรจุภัณฑ์
              </button>
            </div>
          </div>

          {/* Filter Panel (Expandable) */}
          {(filterOpen || selectedCustomer !== "ทั้งหมด" || selectedCategory !== "ทั้งหมด" || selectedStatus !== "ทั้งหมด" || searchTerm !== "") && (
            <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 transition-all duration-200">`;

const replacementFilterBlock = `        {/* Table Header Section */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-sm">คลังบรรจุภัณฑ์ปัจจุบัน</h3>
            <div className="flex gap-2">
              <button 
                onClick={() => setCreateModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" /> เพิ่มบรรจุภัณฑ์
              </button>
            </div>
          </div>

          {/* Filter Panel (Always visible) */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 transition-all duration-200">`;

if (code.includes(targetFilterBlock)) {
  code = code.replace(targetFilterBlock, replacementFilterBlock);
  console.log("Filter block layout updated!");
} else {
  console.log("Filter block layout NOT found!");
}

// 3. Remove trailing filter panel closing parenthesis
const targetTrailingClosing = `              {/* Reset Filters Button */}
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
            </div>
          )}
        </div>`;

const replacementTrailingClosing = `              {/* Reset Filters Button */}
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
            </div>
        </div>`;

if (code.includes(targetTrailingClosing)) {
  code = code.replace(targetTrailingClosing, replacementTrailingClosing);
  console.log("Trailing filter closing removed successfully!");
} else {
  console.log("Trailing filter closing NOT found!");
}

// 4. Remove 'สต็อกรวม' badges from the tables
const targetTabTables = `              {activeTab === "pack" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <Package className="h-4.5 w-4.5 text-blue-600 shrink-0" />
                      <h4 className="font-black text-slate-800 text-[13px] uppercase tracking-wider text-left">บรรจุภัณฑ์ ({packItems.length} รายการ)</h4>
                    </div>
                    <span className="text-[9px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-md font-mono shrink-0">
                      สต็อกรวม: {packItems.reduce((sum, p) => sum + p.currentQuantity, 0).toLocaleString()} ชิ้น
                    </span>
                  </div>
                  {renderPackagingTable(packItems, "ไม่พบข้อมูลบรรจุภัณฑ์")}
                </div>
              )}

              {activeTab === "label" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4.5 w-4.5 text-purple-600 shrink-0" />
                      <h4 className="font-black text-slate-800 text-[13px] uppercase tracking-wider text-left">ฉลาก ({labelItems.length} รายการ)</h4>
                    </div>
                    <span className="text-[9px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-md font-mono shrink-0">
                      สต็อกรวม: {labelItems.reduce((sum, p) => sum + p.currentQuantity, 0).toLocaleString()} ชิ้น
                    </span>
                  </div>
                  {renderPackagingTable(labelItems, "ไม่พบข้อมูลฉลาก")}
                </div>
              )}

              {activeTab === "post" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4.5 w-4.5 text-indigo-600 shrink-0" />
                      <h4 className="font-black text-slate-800 text-[13px] uppercase tracking-wider text-left">ไปรษณีย์ ({postItems.length} รายการ)</h4>
                    </div>
                    <span className="text-[9px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-md font-mono shrink-0">
                      สต็อกรวม: {postItems.reduce((sum, p) => sum + p.currentQuantity, 0).toLocaleString()} ชิ้น
                    </span>
                  </div>
                  {renderPackagingTable(postItems, "ไม่พบข้อมูลกล่องไปรษณีย์/ซอง")}
                </div>
              )}`;

const replacementTabTables = `              {activeTab === "pack" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <Package className="h-4.5 w-4.5 text-blue-600 shrink-0" />
                      <h4 className="font-black text-slate-800 text-[13px] uppercase tracking-wider text-left">บรรจุภัณฑ์ ({packItems.length} รายการ)</h4>
                    </div>
                  </div>
                  {renderPackagingTable(packItems, "ไม่พบข้อมูลบรรจุภัณฑ์")}
                </div>
              )}

              {activeTab === "label" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4.5 w-4.5 text-purple-600 shrink-0" />
                      <h4 className="font-black text-slate-800 text-[13px] uppercase tracking-wider text-left">ฉลาก ({labelItems.length} รายการ)</h4>
                    </div>
                  </div>
                  {renderPackagingTable(labelItems, "ไม่พบข้อมูลฉลาก")}
                </div>
              )}

              {activeTab === "post" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4.5 w-4.5 text-indigo-600 shrink-0" />
                      <h4 className="font-black text-slate-800 text-[13px] uppercase tracking-wider text-left">ไปรษณีย์ ({postItems.length} รายการ)</h4>
                    </div>
                  </div>
                  {renderPackagingTable(postItems, "ไม่พบข้อมูลกล่องไปรษณีย์/ซอง")}
                </div>
              )}`;

if (code.includes(targetTabTables)) {
  code = code.replace(targetTabTables, replacementTabTables);
  console.log("Tab tables renderer updated to remove total quantities!");
} else {
  console.log("Tab tables renderer NOT found!");
}

fs.writeFileSync(path, code, 'utf8');
console.log("Successfully patched tab styling and layouts in PackagingView.js!");
