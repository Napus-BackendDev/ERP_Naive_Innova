import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/PackagingView.js';
let code = fs.readFileSync(path, 'utf8');

// Normalize line endings
code = code.replace(/\r\n/g, '\n');

// 1. Modify SearchableSelect component definition to add searchable prop, premium borders, and green rings when open
const targetSearchableSelect = `function SearchableSelect({ options, value, onChange, placeholder = "ค้นหาหรือเลือกแบรนด์..." }) {
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
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative w-full text-left" ref={dropdownRef}>
      <div
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch("");
        }}
        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus-within:border-green-500 outline-none text-xs text-slate-800 cursor-pointer flex justify-between items-center font-semibold transition-all hover:bg-slate-100/50"
      >
        <span className={selectedOption ? "text-slate-800" : "text-slate-400"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className="h-4 w-4 text-slate-400 shrink-0 ml-2" />
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden max-h-56 flex flex-col">
          <div className="p-2 border-b border-slate-100 flex items-center gap-1.5 shrink-0 bg-slate-50">
            <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหา..."
              onClick={(e) => e.stopPropagation()}
              className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-green-500 font-medium text-slate-800"
            />
          </div>
          <div className="overflow-y-auto flex-1 max-h-40">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <div
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={\`w-full text-left px-3 py-2.5 text-xs transition-colors cursor-pointer font-semibold \${
                    opt.value === value
                      ? "bg-green-50 text-green-700 font-bold"
                      : "hover:bg-slate-50 text-slate-700"
                  }\`}
                >
                  {opt.label}
                </div>
              ))
            ) : (
              <div className="px-3 py-2.5 text-xs text-slate-400 text-center font-medium">ไม่พบผลลัพธ์</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}`;

const replacementSearchableSelect = `function SearchableSelect({ options, value, onChange, placeholder = "ค้นหาหรือเลือก...", searchable = true }) {
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

if (code.includes(targetSearchableSelect)) {
  code = code.replace(targetSearchableSelect, replacementSearchableSelect);
  console.log("SearchableSelect component styling patched!");
} else {
  console.log("SearchableSelect component NOT found!");
}

// 2. Locate the search and selects in optionAFilters and replace them with CustomDropdowns and Green tinted Search Box
const targetFilterBlock = `              {/* Search Input */}
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
                  </select>`;

const replacementFilterBlock = `              {/* Search Input with Green tinted background */}
                  <div className="relative flex-1 min-w-[240px]">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-green-600/70" />
                    <input
                      type="text"
                      placeholder="ค้นหาชื่อ หรือ SKU..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-4 py-2 bg-green-50/30 border border-green-100/70 rounded-xl text-xs outline-none text-slate-700 placeholder-slate-400 font-semibold shadow-3xs transition-all focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-100/50"
                    />
                  </div>

                  {/* Custom Customer Select */}
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

if (code.includes(targetFilterBlock)) {
  code = code.replace(targetFilterBlock, replacementFilterBlock);
  console.log("Search input background tinted green and select dropdowns styled beautifully!");
} else {
  console.log("Target filter block NOT found!");
}

fs.writeFileSync(path, code, 'utf8');
console.log("Patched successfully!");
