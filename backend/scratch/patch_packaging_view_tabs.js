import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/PackagingView.js';
let code = fs.readFileSync(path, 'utf8');

// Normalize line endings
code = code.replace(/\r\n/g, '\n');

// 1. Add activeTab state
const targetState = `  // Modal states
  const [editModalOpen, setEditModalOpen] = useState(false);`;

const replacementState = `  const [activeTab, setActiveTab] = useState("pack"); // "pack", "label", "post"

  // Modal states
  const [editModalOpen, setEditModalOpen] = useState(false);`;

if (code.includes(targetState)) {
  code = code.replace(targetState, replacementState);
  console.log("State activeTab added successfully!");
}

// 2. Add Tab buttons between Widget Bar and Main Content Area (lines 388-390)
const targetDivider = `      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">`;

const replacementDivider = `      </div>

      {/* Clickable Tabs (ระหว่าง Widget Bar และ Data Table) */}
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
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">`;

if (code.includes(targetDivider)) {
  code = code.replace(targetDivider, replacementDivider);
  console.log("Tab buttons layout added successfully!");
}

// 3. Replace the 3 split tables layout to only render the active tab's table
const targetTablesBlock = `        {/* Classify sorted items into 3 separate arrays */}
        {(() => {
          const packItems = sortedPackaging.filter(p => classifyItem(p) === "pack");
          const labelItems = sortedPackaging.filter(p => classifyItem(p) === "label");
          const postItems = sortedPackaging.filter(p => classifyItem(p) === "post");

          return (
            <div className="space-y-6">
              {/* Section 1: บรรจุภัณฑ์ */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <Package className="h-4.5 w-4.5 text-blue-600 shrink-0" />
                    <h4 className="font-black text-slate-800 text-[13px] uppercase tracking-wider text-left">1. บรรจุภัณฑ์ ({packItems.length} รายการ)</h4>
                  </div>
                  <span className="text-[9px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-md font-mono shrink-0">
                    สต็อกรวม: {packItems.reduce((sum, p) => sum + p.currentQuantity, 0).toLocaleString()} ชิ้น
                  </span>
                </div>
                {renderPackagingTable(packItems, "ไม่พบข้อมูลบรรจุภัณฑ์")}
              </div>

              {/* Section 2: ฉลาก */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4.5 w-4.5 text-purple-600 shrink-0" />
                    <h4 className="font-black text-slate-800 text-[13px] uppercase tracking-wider text-left">2. ฉลาก ({labelItems.length} รายการ)</h4>
                  </div>
                  <span className="text-[9px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-md font-mono shrink-0">
                    สต็อกรวม: {labelItems.reduce((sum, p) => sum + p.currentQuantity, 0).toLocaleString()} ชิ้น
                  </span>
                </div>
                {renderPackagingTable(labelItems, "ไม่พบข้อมูลฉลาก")}
              </div>

              {/* Section 3: ไปรษณีย์ */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4.5 w-4.5 text-indigo-600 shrink-0" />
                    <h4 className="font-black text-slate-800 text-[13px] uppercase tracking-wider text-left">3. ไปรษณีย์ ({postItems.length} รายการ)</h4>
                  </div>
                  <span className="text-[9px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-md font-mono shrink-0">
                    สต็อกรวม: {postItems.reduce((sum, p) => sum + p.currentQuantity, 0).toLocaleString()} ชิ้น
                  </span>
                </div>
                {renderPackagingTable(postItems, "ไม่พบข้อมูลกล่องไปรษณีย์/ซอง")}
              </div>
            </div>
          );
        })()}`;

const replacementTablesBlock = `        {/* Render only the active tab's table */}
        {(() => {
          const packItems = sortedPackaging.filter(p => classifyItem(p) === "pack");
          const labelItems = sortedPackaging.filter(p => classifyItem(p) === "label");
          const postItems = sortedPackaging.filter(p => classifyItem(p) === "post");

          return (
            <div className="space-y-4">
              {activeTab === "pack" && (
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
              )}
            </div>
          );
        })()}`;

if (code.includes(targetTablesBlock)) {
  code = code.replace(targetTablesBlock, replacementTablesBlock);
  console.log("Tab tables renderer updated successfully!");
} else {
  console.log("Tab tables renderer NOT found!");
}

fs.writeFileSync(path, code, 'utf8');
console.log("Successfully patched split tabs in PackagingView.js!");
