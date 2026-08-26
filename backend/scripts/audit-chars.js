import "dotenv/config";
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
await mongoose.connect(uri);
const db = mongoose.connection.db;
const custs = await db.collection("customers").find({}).toArray();

// distinct "other" characters in names (not thai/latin/digit/space/common punct)
const other = new Map();
for (const c of custs) for (const ch of String(c.name ?? "")) {
  if (/[฀-๿A-Za-z0-9]/.test(ch)) continue;
  if (/\s|[.,/()\-&'"@#!?:]/.test(ch)) continue;
  other.set(ch, (other.get(ch) || 0) + 1);
}
console.log("=== อักขระ 'อื่นๆ' ในชื่อ (char -> count, U+code) ===");
for (const [ch, n] of [...other.entries()].sort((a, b) => b[1] - a[1]))
  console.log(`  "${ch}"  x${n}   U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`);

// duplication scale
const byName = new Map();
for (const c of custs) {
  const k = String(c.name ?? "").trim().toLowerCase();
  if (!k) continue;
  if (!byName.has(k)) byName.set(k, []);
  byName.get(k).push(c);
}
const dupGroups = [...byName.values()].filter(a => a.length > 1);
const extraRows = dupGroups.reduce((s, a) => s + (a.length - 1), 0);
console.log(`\n=== การซ้ำ ===`);
console.log(`  ชื่อไม่ซ้ำ (unique names): ${byName.size}`);
console.log(`  กลุ่มที่ซ้ำ: ${dupGroups.length}`);
console.log(`  แถวส่วนเกินถ้าเก็บชื่อละ 1: ${extraRows}  (จาก ${custs.length} เหลือ ${custs.length - extraRows})`);

// are duplicates exact re-imports? check if a dup group shares phone+address
let identical = 0;
for (const a of dupGroups) {
  const sig = (x) => `${x.phone || ""}|${x.address || ""}`;
  const sigs = new Set(a.map(sig));
  if (sigs.size === 1) identical++;
}
console.log(`  กลุ่มซ้ำที่ เบอร์+ที่อยู่ ตรงกันเป๊ะ (= re-import): ${identical}/${dupGroups.length}`);

// section distribution to see the re-import pattern
const bySection = {};
for (const c of custs) bySection[c.section] = (bySection[c.section] || 0) + 1;
console.log(`\n=== ตาม section ===`);
for (const [s, n] of Object.entries(bySection).sort((a, b) => b[1] - a[1]))
  console.log(`  ${s}: ${n}`);

await mongoose.disconnect();
