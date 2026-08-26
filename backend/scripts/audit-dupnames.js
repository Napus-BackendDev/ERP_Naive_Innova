import "dotenv/config";
import mongoose from "mongoose";
const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
await mongoose.connect(uri);
const db = mongoose.connection.db;
const custs = await db.collection("customers").find({}).toArray();

const by = new Map();
for (const c of custs) {
  const k = String(c.name ?? "").trim().toLowerCase();
  if (!k) continue;
  if (!by.has(k)) by.set(k, []);
  by.get(k).push(c);
}
const dupes = [...by.entries()].filter(([, a]) => a.length > 1);
console.log(`ชื่อซ้ำ: ${dupes.length} กลุ่ม\n`);
const t = (d) => d ? new Date(d).toISOString().slice(0, 16).replace("T", " ") : "-";
for (const [name, rows] of dupes) {
  console.log(`● "${name}"  (${rows.length})`);
  rows.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
  rows.forEach((c, i) => {
    console.log(`   ${i === 0 ? "KEEP" : "  - "} phone="${c.phone || ""}" addr="${String(c.address || "").slice(0, 18)}" sec=${c.section} upd=${t(c.updatedAt || c.createdAt)}`);
    console.log(`        note="${String(c.notes || "").replace(/\s+/g, " ").slice(0, 70)}"`);
  });
}
await mongoose.disconnect();
