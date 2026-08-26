import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/ProductionView.js';
let code = fs.readFileSync(path, 'utf8');

// Target the start of the return JSX block
const target = `  return (
    <div className="flex flex-col gap-6 select-none text-left w-full">
      
      {/* 1. Widgets: KPI Cards */}`;

const replacement = `  return (
    <div className="flex flex-col gap-6 select-none text-left w-full">
      
      {/* Top Header Title & Kanban Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white border border-slate-150 p-5 shadow-xs rounded-2xl gap-4">
        <div>
          <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
            <Layers className="h-4.5 w-4.5 text-blue-600" />
            <span>แดชบอร์ดติดตามสายการผลิต (MES Production Dashboard)</span>
          </h2>
          <p className="text-[10.5px] text-slate-400 font-semibold mt-0.5">ควบคุมสถานะลำดับคิว กระบวนการบรรจุขวด และการติดฉลากในไลน์การผลิตจริง</p>
        </div>
        <button
          type="button"
          onClick={() => window.open("/admin/production/kanban", "_blank")}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white border border-blue-650 rounded-xl text-xs font-black transition-all cursor-pointer shadow-md shadow-blue-100 flex items-center gap-1.5 active:scale-95 shrink-0"
        >
          <Layers className="h-4 w-4" />
          <span>บอร์ดภาพรวมการผลิต (Kanban Board) ↗</span>
        </button>
      </div>

      {/* 1. Widgets: KPI Cards */}`;

code = code.replace(target, replacement);

fs.writeFileSync(path, code, 'utf8');
console.log("Successfully added Kanban button to ProductionView.js dashboard header!");
