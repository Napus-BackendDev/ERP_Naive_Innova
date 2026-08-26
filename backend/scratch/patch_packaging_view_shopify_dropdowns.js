import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/PackagingView.js';
let code = fs.readFileSync(path, 'utf8');

// Normalize line endings
code = code.replace(/\r\n/g, '\n');

// 1. Add Check icon to lucide-react import list
const targetImport = `import { Package, Tag, Mail, AlertTriangle, SlidersHorizontal, Camera, Edit2, Trash2, X, Plus, CheckCircle, XCircle, ChevronDown, Search, Minus } from "lucide-react";`;
const replacementImport = `import { Package, Tag, Mail, AlertTriangle, SlidersHorizontal, Camera, Edit2, Trash2, X, Plus, CheckCircle, XCircle, ChevronDown, Search, Minus, Check } from "lucide-react";`;

if (code.includes(targetImport)) {
  code = code.replace(targetImport, replacementImport);
  console.log("Check icon added to imports!");
} else {
  console.log("Imports target NOT found!");
}

// 2. Redesign SearchableSelect component into Shopify Style (with prefix and checkmark)
const targetSearchableSelect = `function SearchableSelect({ options, value, onChange, placeholder = "ค้นหาหรือเลือก...", searchable = true }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);
  const filteredOptions = options.filter(opt =>
    (opt.label || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative w-full text-left" ref={dropdownRef}>
      <div
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch("");
        }}
        className={"w-full px-3 py-2 bg-white border rounded-xl outline-none text-xs text-slate-700 cursor-pointer flex justify-between items-center font-bold transition-all shadow-3xs hover:bg-slate-50/50 " + (isOpen ? "border-green-600 ring-2 ring-green-50" : "border-slate-200")}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={"h-3.5 w-3.5 text-slate-400 shrink-0 ml-1.5 transition-transform duration-200 " + (isOpen ? "rotate-180 text-green-600" : "")} />
      </div>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 bg-white border border-slate-100 rounded-xl shadow-lg shadow-slate-200/80 z-50 overflow-hidden max-h-64 flex flex-col min-w-[200px] animate-in fade-in slide-in-from-top-1 duration-100">
          {searchable && (
            <div className="p-2 border-b border-slate-100 flex items-center gap-1.5 shrink-0 bg-slate-50">
              <Search className="h-3 w-3 text-slate-400 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearchTerm ? setSearch(e.target.value) : setSearch(e.target.value)}
                placeholder="ค้นหา..."
                onClick={(e) => e.stopPropagation()}
                className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] outline-none focus:border-green-500 font-semibold text-slate-800"
              />
            </div>
          )}
          <div className="overflow-y-auto flex-1 max-h-48 divide-y divide-slate-50">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <div
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={\`w-full text-left px-3 py-2 text-[11px] transition-colors cursor-pointer font-bold \${
                    opt.value === value
                      ? "bg-green-50 text-green-700 font-extrabold border-l-2 border-green-600"
                      : "hover:bg-slate-50/70 text-slate-600 hover:text-slate-800"
                  }\`}
                >
                  {opt.label}
                </div>
              ))
            ) : (
              <div className="px-3 py-3 text-[11px] text-slate-400 text-center font-medium">ไม่พบผลลัพธ์</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}`;

const replacementSearchableSelect = `function SearchableSelect({ options, value, onChange, placeholder = "เลือก...", searchable = true, prefix = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);
  const filteredOptions = options.filter(opt =>
    (opt.label || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative w-full text-left" ref={dropdownRef}>
      <div
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch("");
        }}
        className={"w-full px-3 py-2.5 bg-white border rounded-xl outline-none text-xs text-slate-700 cursor-pointer flex justify-between items-center font-semibold transition-all shadow-3xs hover:bg-slate-50/50 " + (isOpen ? "border-green-600 ring-2 ring-green-50" : "border-slate-200")}
      >
        <span className="truncate flex items-center gap-1">
          {prefix && <span className="text-slate-400 font-bold">{prefix}:</span>}
          <span className="font-extrabold text-slate-800">{selectedOption ? selectedOption.label : placeholder}</span>
        </span>
        <ChevronDown className={"h-3.5 w-3.5 text-slate-400 shrink-0 ml-1.5 transition-transform duration-200 " + (isOpen ? "rotate-180 text-green-600" : "")} />
      </div>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 bg-white border border-slate-100 rounded-xl shadow-lg shadow-slate-200/80 z-50 overflow-hidden max-h-64 flex flex-col min-w-[200px] animate-in fade-in slide-in-from-top-1 duration-100">
          {searchable && (
            <div className="p-2 border-b border-slate-100 flex items-center gap-1.5 shrink-0 bg-slate-50">
              <Search className="h-3 w-3 text-slate-400 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหา..."
                onClick={(e) => e.stopPropagation()}
                className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] outline-none focus:border-green-500 font-semibold text-slate-800"
              />
            </div>
          )}
          <div className="overflow-y-auto flex-1 max-h-48 divide-y divide-slate-50">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <div
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={\`w-full text-left px-3 py-2 text-[11px] transition-colors cursor-pointer font-bold flex justify-between items-center \${
                    opt.value === value
                      ? "bg-green-50/50 text-green-700 font-extrabold"
                      : "hover:bg-slate-50/70 text-slate-600 hover:text-slate-800"
                  }\`}
                >
                  <span className="truncate">{opt.label}</span>
                  {opt.value === value && <Check className="h-3 w-3 text-green-600 shrink-0 ml-1.5" />}
                </div>
              ))
            ) : (
              <div className="px-3 py-3 text-[11px] text-slate-400 text-center font-medium">ไม่พบผลลัพธ์</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}`;

if (code.includes(targetSearchableSelect)) {
  code = code.replace(targetSearchableSelect, replacementSearchableSelect);
  console.log("SearchableSelect component updated to Shopify style!");
} else {
  console.log("SearchableSelect target NOT found!");
}

// 3. Update the parameters of the dropdowns to clean options and prefix tags
const targetDropdownsBlock = `                  {/* Custom Customer Select */}
                  <div className="w-[180px]">
                    <SearchableSelect
                      options={[
                        { label: "แบรนด์ลูกค้า: ทั้งหมด", value: "ทั้งหมด" },
                        ...activeBrands.map(brandName => ({
                          label: \`\${brandName === "ระบบ" ? "ระบบ (System)" : brandName === "กลาง" ? "กลาง (General)" : brandName} (\${brandCounts[brandName] || 0})\`,
                          value: brandName
                        }))
                      ]}
                      value={selectedCustomer}
                      onChange={setSelectedCustomer}
                      placeholder="เลือกแบรนด์ลูกค้า..."
                      searchable={activeBrands.length > 5}
                    />
                  </div>

                  {/* Custom Category Select */}
                  <div className="w-[180px]">
                    <SearchableSelect
                      options={[
                        { label: "หมวดหมู่: ทั้งหมด", value: "ทั้งหมด" },
                        ...activeCategories.map(cat => ({
                          label: \`\${cat.name} (\${categoryCounts[cat._id.toString()] || 0})\`,
                          value: cat._id
                        }))
                      ]}
                      value={selectedCategory}
                      onChange={setSelectedCategory}
                      placeholder="เลือกหมวดหมู่..."
                      searchable={activeCategories.length > 5}
                    />
                  </div>

                  {/* Custom Status Select */}
                  <div className="w-[160px]">
                    <SearchableSelect
                      options={[
                        { label: "สถานะสต็อก: ทั้งหมด", value: "ทั้งหมด" },
                        { label: \`ปกติ (\${activeTabItems.filter(p => p.currentQuantity >= 500).length})\`, value: "ปกติ" },
                        { label: \`สต็อกใกล้หมด (\${activeTabItems.filter(p => p.currentQuantity > 0 && p.currentQuantity < 500).length})\`, value: "สต็อกใกล้หมด" },
                        { label: \`สินค้าหมด (\${activeTabItems.filter(p => p.currentQuantity === 0).length})\`, value: "สินค้าหมด" }
                      ]}
                      value={selectedStatus}
                      onChange={setSelectedStatus}
                      placeholder="เลือกสถานะสต็อก..."
                      searchable={false}
                    />
                  </div>`;

const replacementDropdownsBlock = `                  {/* Custom Customer Select */}
                  <div className="w-[180px]">
                    <SearchableSelect
                      options={[
                        { label: "ทั้งหมด", value: "ทั้งหมด" },
                        ...activeBrands.map(brandName => ({
                          label: \`\${brandName === "ระบบ" ? "ระบบ" : brandName === "กลาง" ? "กลาง" : brandName} (\&nbsp;\${brandCounts[brandName] || 0}\&nbsp;)\`.replace(/\&nbsp;/g, ' '),
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
                  </div>`;

if (code.includes(targetDropdownsBlock)) {
  code = code.replace(targetDropdownsBlock, replacementDropdownsBlock);
  console.log("Dropdown selectors updated to use prefix parameters!");
} else {
  console.log("Dropdown selectors target NOT found!");
}

fs.writeFileSync(path, code, 'utf8');
console.log("Shopify dropdowns patch complete!");
