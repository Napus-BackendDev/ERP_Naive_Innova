import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/ProductionView.js';
let code = fs.readFileSync(path, 'utf8');

// 1. Locate the Filters row (Card 3)
const targetFiltersBlock = `      {/* 3. Filters and Search Row */}
      <Card className="bg-white border border-slate-200 p-4 shadow-2xs rounded-2xl flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3.5">
        
        {/* Search */}
        <div className="relative flex-grow max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="ค้นหาชื่อลูกค้า หรือแบรนด์..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-green-500 focus:ring-1 focus:ring-green-100 transition-all placeholder:text-slate-400 placeholder:font-medium"
          />
        </div>

        {/* Filters and Sort */}
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

        </div>

      </Card>`;

// Remove it from the original location
code = code.replace(targetFiltersBlock, '');

// 2. Insert it inside the Table card, below the header flex row
const targetTableCardHeader = `<Card className="bg-white border border-slate-200 p-6 shadow-sm rounded-2xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-slate-100 pb-3">`;

const replacementTableCardHeader = `<Card className="bg-white border border-slate-200 p-6 shadow-sm rounded-2xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 border-b border-slate-100 pb-3">`;

code = code.replace(targetTableCardHeader, replacementTableCardHeader);

const insertAfterSelector = `          </div>
        </div>`;

// Find where this header flex row ends within the Table Card
const headerEndIdx = code.indexOf(replacementTableCardHeader);
if (headerEndIdx !== -1) {
  const restOfCode = code.substring(headerEndIdx);
  const endFlexIdx = restOfCode.indexOf(insertAfterSelector);
  
  if (endFlexIdx !== -1) {
    const insertPosition = headerEndIdx + endFlexIdx + insertAfterSelector.length;
    
    const embeddedFiltersRow = `

        {/* Embedded Filters and Search Row */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3.5 mb-5 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
          
          {/* Search */}
          <div className="relative flex-grow max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="ค้นหาชื่อลูกค้า หรือแบรนด์..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-green-500 focus:ring-1 focus:ring-green-100 bg-white transition-all placeholder:text-slate-400 placeholder:font-medium"
            />
          </div>

          {/* Filters and Sort */}
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

          </div>
        </div>`;
        
    code = code.substring(0, insertPosition) + embeddedFiltersRow + code.substring(insertPosition);
    console.log("Successfully embedded Filters & Search Row inside Table Card container!");
  }
}

fs.writeFileSync(path, code, 'utf8');
console.log("Completed Search & Filter repositioning patch!");
