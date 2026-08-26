import "dotenv/config";
import mongoose from "mongoose";
const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
await mongoose.connect(uri);
const db = mongoose.connection.db;
const custs = await db.collection("customers").find({}).toArray();

// weird = zero-width, Hangul syllables, private-use, or any non Thai/Latin/digit/common-punct/space
const weird = /[​-‏‪-‮-가-퟿]/;
const seen = new Set(), out = [];
for (const c of custs) {
  const name = String(c.name ?? "");
  if (!weird.test(name)) continue;
  const key = name.toLowerCase();
  if (seen.has(key)) continue; seen.add(key);
  const codes = [...name].filter(ch => weird.test(ch))
    .map(ch => "U+" + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0"));
  out.push({ id: String(c._id), name, codes: [...new Set(codes)].join(",") });
}
console.log(`ชื่อ (ไม่ซ้ำ) ที่มีอักขระแปลก: ${out.length}\n`);
for (const o of out) console.log(`  "${o.name}"\n     [${o.codes}]  id=${o.id}`);
await mongoose.disconnect();
