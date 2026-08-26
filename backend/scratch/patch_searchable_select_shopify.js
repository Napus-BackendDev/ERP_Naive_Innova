import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/PackagingView.js';
let code = fs.readFileSync(path, 'utf8');

// Normalize line endings
code = code.replace(/\r\n/g, '\n');

// Find start of function SearchableSelect
const startToken = 'function SearchableSelect({';
const startIndex = code.indexOf(startToken);

// Find end of SearchableSelect (before // Helper to generate a mockup SKU)
const endToken = '// Helper to generate a mockup SKU';
const endIndex = code.indexOf(endToken);

if (startIndex !== -1 && endIndex !== -1) {
  const beforePart = code.slice(0, startIndex);
  const afterPart = code.slice(endIndex);

  const shopifySearchableSelect = `function SearchableSelect({ options, value, onChange, placeholder = "เลือก...", searchable = true, prefix = "" }) {
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
        className={"w-full px-3 py-2 bg-white border rounded-xl outline-none text-xs text-slate-700 cursor-pointer flex justify-between items-center font-semibold transition-all shadow-3xs hover:bg-slate-50/50 " + (isOpen ? "border-green-600 ring-2 ring-green-50" : "border-slate-200")}
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
}

`;

  code = beforePart + shopifySearchableSelect + afterPart;
  console.log("Successfully replaced SearchableSelect with Shopify layout!");
} else {
  console.log("Indexes not found!");
}

fs.writeFileSync(path, code, 'utf8');
console.log("Done!");
