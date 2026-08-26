// Migration: convert the floating weekday index (scheduleStartDay/EndDay, 0-6)
// on scheduled orders into REAL dates (scheduleStartDate/EndDate "YYYY-MM-DD").
//
// Why: the index was never anchored to a week — the grid recomputes its columns
// from whatever date the user is viewing, so a block stored as "จันทร์" drifted
// onto Monday of every week. A real date pins it.
//
// Anchor rule: resolve the index against the Monday of the week the order was
// last scheduled in. We don't store that, so we use the doc's updatedAt (falling
// back to createdAt, then today) as the anchor week — the closest honest guess.
//
// Only touches products that HAVE a scheduleMachineId and no scheduleStartDate.
// Backs up every affected customer first. Idempotent: re-running skips docs that
// already carry a date.
//
// Run:  node scripts/migrate-schedule-to-dates.js          (dry-run)
//       node scripts/migrate-schedule-to-dates.js --apply

import "dotenv/config";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const APPLY = process.argv.includes("--apply");
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Monday of the week containing `d`, then + dayIndex (0=Mon .. 6=Sun).
function dateFromIndex(anchor, dayIndex) {
  const base = new Date(anchor);
  if (isNaN(base.getTime())) return "";
  const dow = base.getDay();                       // 0=Sun..6=Sat
  const diff = base.getDate() - dow + (dow === 0 ? -6 : 1);
  const monday = new Date(base.getFullYear(), base.getMonth(), diff);
  monday.setDate(monday.getDate() + Math.min(6, Math.max(0, Number(dayIndex) || 0)));
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, "0");
  const d = String(monday.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error("MONGODB_URI not set");
  await mongoose.connect(uri);
  const customers = mongoose.connection.db.collection("customers");

  const docs = await customers.find({ "orderedProducts.scheduleMachineId": { $nin: ["", null] } }).toArray();
  console.log(`customers with a scheduled product: ${docs.length}`);
  if (!docs.length) { await mongoose.disconnect(); return; }

  const backupDir = path.join(__dirname, "backup");
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  fs.writeFileSync(path.join(backupDir, `customers-schedule-${stamp}.json`), JSON.stringify(docs, null, 2));
  console.log(`Backup written: backup/customers-schedule-${stamp}.json`);

  let touchedDocs = 0, converted = 0, skippedHasDate = 0, skippedNoIndex = 0;
  const preview = [];

  for (const c of docs) {
    const ops = Array.isArray(c.orderedProducts) ? c.orderedProducts : [];
    let touched = false;
    const anchor = c.updatedAt || c.createdAt || new Date();

    ops.forEach((p, idx) => {
      if (!p || !p.scheduleMachineId) return;
      if (p.scheduleStartDate) { skippedHasDate++; return; }
      if (p.scheduleStartDay === null || p.scheduleStartDay === undefined) { skippedNoIndex++; return; }

      const start = dateFromIndex(anchor, p.scheduleStartDay);
      const endIdx = (p.scheduleEndDay === null || p.scheduleEndDay === undefined)
        ? p.scheduleStartDay
        : p.scheduleEndDay;
      const end = dateFromIndex(anchor, endIdx);
      if (!start) return;

      p.scheduleStartDate = start;
      p.scheduleEndDate = end < start ? start : end;
      p.scheduleStartDay = null;   // retire the floating index so it can't win later
      p.scheduleEndDay = null;
      touched = true;
      converted++;
      if (preview.length < 8) {
        preview.push({ customer: c.name, product: idx, machine: p.scheduleMachineId, date: `${p.scheduleStartDate}..${p.scheduleEndDate}` });
      }
    });

    if (touched) {
      touchedDocs++;
      if (APPLY) await customers.updateOne({ _id: c._id }, { $set: { orderedProducts: ops } });
    }
  }

  console.log("sample:", JSON.stringify(preview, null, 1));
  console.log(`converted products: ${converted} across ${touchedDocs} customers`);
  console.log(`skipped — already dated: ${skippedHasDate}, no index to convert: ${skippedNoIndex}`);
  console.log(APPLY ? "APPLIED." : "DRY-RUN. Re-run with --apply to execute.");

  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
