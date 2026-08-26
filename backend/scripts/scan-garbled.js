// Read-only sweep for garbled text across every collection: mojibake (Thai
// decoded as Latin-1), Unicode replacement characters, and literal error
// tokens that leaked into data ("undefined", "[object Object]", "NaN", "Error").
//
// Reports only — never writes. Prints collection, _id, field path and a snippet
// so a human can decide fix-vs-delete.
//
//   node scripts/scan-garbled.js

import "dotenv/config";
import mongoose from "mongoose";

// Patterns that almost never occur in legitimate Thai/English business data.
const CHECKS = [
  { key: "replacement", re: /�/, desc: "� (U+FFFD replacement char)" },
  // Thai UTF-8 bytes shown as Latin-1: ก-๙ start with à¸/à¹, common tell.
  { key: "mojibake-th", re: /Ã[-¿]|à[¸¹º»]|â€|Â[-¿]/, desc: "mojibake (Thai decoded as Latin-1)" },
  { key: "literal-undefined", re: /\bundefined\b/, desc: 'literal "undefined"' },
  { key: "object-object", re: /\[object Object\]/, desc: "[object Object]" },
  { key: "literal-nan", re: /(^|[\s:=])NaN($|[\s,])/, desc: "literal NaN" },
  { key: "literal-error", re: /\bError\b/i, desc: 'the word "Error"' },
];

// Walk a document, yielding [path, string] for every string leaf.
function* strings(val, path = "") {
  if (val == null) return;
  if (typeof val === "string") { yield [path, val]; return; }
  if (Array.isArray(val)) { for (let i = 0; i < val.length; i++) yield* strings(val[i], `${path}[${i}]`); return; }
  if (typeof val === "object" && !(val instanceof Date) && !(val._bsontype)) {
    for (const k of Object.keys(val)) yield* strings(val[k], path ? `${path}.${k}` : k);
  }
}

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error("MONGODB_URI not set");
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  console.log("DB:", db.databaseName, "\n");

  const cols = (await db.listCollections().toArray()).map(c => c.name).sort();
  const perCheck = Object.fromEntries(CHECKS.map(c => [c.key, 0]));
  const hits = [];   // { col, id, field, check, snippet }

  for (const name of cols) {
    const docs = await db.collection(name).find({}).toArray();
    for (const doc of docs) {
      for (const [field, s] of strings(doc)) {
        // Skip obvious base64 image blobs — huge, and their random chars trip
        // the Latin-1 test with false positives.
        if (s.length > 4000 || /^data:image\//.test(s) || /^[A-Za-z0-9+/]{200,}={0,2}$/.test(s)) continue;
        for (const c of CHECKS) {
          if (c.re.test(s)) {
            perCheck[c.key]++;
            hits.push({ col: name, id: String(doc._id), field, check: c.key,
              snippet: s.replace(/\s+/g, " ").slice(0, 90) });
          }
        }
      }
    }
  }

  console.log("=== summary ===");
  for (const c of CHECKS) console.log(`  ${perCheck[c.key].toString().padStart(4)}  ${c.desc}`);
  console.log(`  total hits: ${hits.length}\n`);

  // Group by collection + check
  const byCol = {};
  for (const h of hits) ((byCol[h.col] = byCol[h.col] || {})[h.check] = (byCol[h.col][h.check] || 0) + 1);
  console.log("=== by collection ===");
  for (const [col, checks] of Object.entries(byCol))
    console.log(`  ${col}: ${Object.entries(checks).map(([k, n]) => `${k}=${n}`).join(", ")}`);

  console.log("\n=== samples (up to 40) ===");
  for (const h of hits.slice(0, 40))
    console.log(`  [${h.col}] ${h.field} (${h.check})\n     id=${h.id}\n     "${h.snippet}"`);

  await mongoose.disconnect();
}

main().catch(e => { console.error("FAILED:", e.message); process.exit(1); });
