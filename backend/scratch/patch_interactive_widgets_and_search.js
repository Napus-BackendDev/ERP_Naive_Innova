import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/ProductionView.js';
let code = fs.readFileSync(path, 'utf8');

// Normalize line endings
code = code.replace(/\r\n/g, '\n');

// 1. Replace the entire widgets block (lines 927-968) with interactive clickable widgets
const targetWidgets = `      {/* 1. Widgets: KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-white border border-slate-200 p-4 shadow-2xs rounded-2xl flex flex-col gap-1.5">
          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">ใบสั่งผลิตทั้งหมด</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-800">{stats.total}</span>
            <span className="text-[10px] text-slate-400 font-bold">รายการ</span>
          </div>
        </Card>
        
        <Card className="bg-white border border-slate-200 p-4 shadow-2xs rounded-2xl flex flex-col gap-1.5">
          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">ยังไม่พร้อมผลิต</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-rose-600">{stats.notReady}</span>
            <span className="text-[10px] text-slate-455 font-bold">คิวขาดของ</span>
          </div>
        </Card>

        <Card className="bg-white border border-slate-200 p-4 shadow-2xs rounded-2xl flex flex-col gap-1.5">
          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">รอยืนยันผลิต</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-amber-600">{stats.pendingConf}</span>
            <span className="text-[10px] text-slate-455 font-bold">ของพร้อมแล้ว</span>
          </div>
        </Card>

        <Card className="bg-white border border-slate-200 p-4 shadow-2xs rounded-2xl flex flex-col gap-1.5">
          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">กำลังอยู่ในสายผลิต</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-green-600">{stats.activeProduction}</span>
            <span className="text-[10px] text-slate-455 font-bold font-mono">Steps 2-5</span>
          </div>
        </Card>

        <Card className="bg-white border border-slate-200 p-4 shadow-2xs rounded-2xl flex flex-col gap-1.5">
          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">เสร็จสมบูรณ์แล้ว</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-600">{stats.completed}</span>
            <span className="text-[10px] text-slate-455 font-bold font-mono">จัดส่งแล้ว</span>
          </div>
        </Card>
      </div>`;

// Wait, the original code had:
// span className="text-[10px] text-slate-455 font-bold font-mono">จัดส่งแล้ว
// Let's replace the exact block in the file. Let's do a looser match to be safe!
const targetWidgetsLooseStart = `      {/* 1. Widgets: KPI Cards */}`;
const targetWidgetsLooseEnd = `      {/* 2. Visualizations: Left Side holding areas & Right Side machines list */}`;

const startIdx = code.indexOf(targetWidgetsLooseStart);
const endIdx = code.indexOf(targetWidgetsLooseEnd);

if (startIdx !== -1 && endIdx !== -1) {
  const replacementWidgets = `      {/* 1. Widgets: KPI Cards (Click to Filter Table) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Total Card */}
        <div 
          onClick={() => setStatusFilter("all")}
          className={\`cursor-pointer transition-all hover:scale-102 active:scale-98 border-2 p-4 shadow-2xs rounded-2xl flex flex-col gap-1.5 select-none \${
            statusFilter === "all" ? "border-blue-500 bg-blue-50/15" : "border-slate-200 bg-white hover:border-slate-300"
          }\`}
        >
          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">ใบสั่งผลิตทั้งหมด</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-800">{stats.total}</span>
            <span className="text-[10px] text-slate-400 font-bold">รายการ</span>
          </div>
        </div>
        
        {/* Not Ready Card */}
        <div 
          onClick={() => setStatusFilter("not-ready")}
          className={\`cursor-pointer transition-all hover:scale-102 active:scale-98 border-2 p-4 shadow-2xs rounded-2xl flex flex-col gap-1.5 select-none \${
            statusFilter === "not-ready" ? "border-rose-500 bg-rose-50/15" : "border-slate-200 bg-white hover:border-slate-300"
          }\`}
        >
          <span className="text-[10px] text-slate-450 font-extrabold uppercase tracking-wider">ยังไม่พร้อมผลิต</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-rose-600">{stats.notReady}</span>
            <span className="text-[10px] text-slate-400 font-bold">คิวขาดของ</span>
          </div>
        </div>

        {/* Pending Conf Card */}
        <div 
          onClick={() => setStatusFilter("pending-conf")}
          className={\`cursor-pointer transition-all hover:scale-102 active:scale-98 border-2 p-4 shadow-2xs rounded-2xl flex flex-col gap-1.5 select-none \${
            statusFilter === "pending-conf" ? "border-amber-500 bg-amber-50/15" : "border-slate-200 bg-white hover:border-slate-300"
          }\`}
        >
          <span className="text-[10px] text-slate-450 font-extrabold uppercase tracking-wider">รอยืนยันผลิต</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-amber-600">{stats.pendingConf}</span>
            <span className="text-[10px] text-slate-400 font-bold">ของพร้อมแล้ว</span>
          </div>
        </div>

        {/* In Line Card */}
        <div 
          onClick={() => setStatusFilter("producing")}
          className={\`cursor-pointer transition-all hover:scale-102 active:scale-98 border-2 p-4 shadow-2xs rounded-2xl flex flex-col gap-1.5 select-none \${
            statusFilter === "producing" ? "border-blue-500 bg-blue-50/15" : "border-slate-200 bg-white hover:border-slate-300"
          }\`}
        >
          <span className="text-[10px] text-slate-450 font-extrabold uppercase tracking-wider">กำลังอยู่ในสายผลิต</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-blue-600">{stats.activeProduction}</span>
            <span className="text-[10px] text-slate-400 font-bold">Steps 2-5</span>
          </div>
        </div>

        {/* Completed Card */}
        <div 
          onClick={() => setStatusFilter("completed")}
          className={\`cursor-pointer transition-all hover:scale-102 active:scale-98 border-2 p-4 shadow-2xs rounded-2xl flex flex-col gap-1.5 select-none \${
            statusFilter === "completed" ? "border-emerald-500 bg-emerald-50/15" : "border-slate-200 bg-white hover:border-slate-300"
          }\`}
        >
          <span className="text-[10px] text-slate-450 font-extrabold uppercase tracking-wider">เสร็จสมบูรณ์แล้ว</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-600">{stats.completed}</span>
            <span className="text-[10px] text-slate-400 font-bold font-mono">จัดส่งแล้ว</span>
          </div>
        </div>
      </div>
      
      `;
  code = code.substring(0, startIdx) + replacementWidgets + code.substring(endIdx);
  console.log("Successfully patched interactive widgets!");
} else {
  console.log("Failed to find widgets boundaries!");
}

// 2. Remove the Sort dropdown and Status Filter dropdown from the table toolbar
const targetFiltersAndSort = `          {/* Filters and Sort */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-600 bg-white outline-none cursor-pointer focus:border-green-500"
              >
                <option value="all">กรอง: ทั้งหมด</option>
                <option value="not-ready">กรอง: ยังไม่พร้อม</option>
                <option value="pending-conf">กรอง: รอยืนยัน</option>
                <option value="qa1">กรอง: QA รอบที่ 1</option>
                <option value="producing">กรอง: กำลังผลิต/ห่อหุ้ม</option>
                <option value="ready-mach">กรอง: เลือกเครื่องจักร</option>
                <option value="ready-pack">กรอง: รอบรรจุ</option>
                <option value="qa2">กรอง: QA รอบที่ 2</option>
                <option value="pending-cust">กรอง: รอลูกค้ายืนยัน</option>
                <option value="cust-confirmed">กรอง: ลูกค้ายืนยันแล้ว</option>
                <option value="completed">กรอง: จัดส่งแล้ว</option>
              </select>
            </div>

            {/* Sort By */}
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-600 bg-white outline-none cursor-pointer focus:border-green-500"
              >
                <option value="name-asc">เรียง: ชื่อ ก-ฮ</option>
                <option value="name-desc">เรียง: ชื่อ ฮ-ก</option>
                <option value="step-asc">เรียง: ขั้นผลิต 1-5</option>
                <option value="step-desc">เรียง: ขั้นผลิต 5-1</option>
              </select>
            </div>

          </div>`;

code = code.replace(targetFiltersAndSort, '');
console.log("Successfully removed Sort and Status filter select boxes!");

fs.writeFileSync(path, code, 'utf8');
