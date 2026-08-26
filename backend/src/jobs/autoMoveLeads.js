import CrmColumn from "../features/sales/crmColumn.model.js";
import Customer from "../features/customers/customer.model.js";
import ActivityLog from "../features/logs/activityLog.model.js";

// Sales board auto-move ("ย้ายอัตโนมัติ" on a column): a deal that has sat in one
// stage longer than triggerDays is moved to the configured target column.
//
// This used to run only in the browser, inside a useEffect on the Sales page —
// so nothing moved unless somebody had the page open, and a board left alone for
// a month did all its moving in one burst the next time it was opened. Running it
// on the server makes the rule true whether anyone is looking or not.

const HOUR_MS = 60 * 60 * 1000;

export async function runAutoMove() {
  const columns = await CrmColumn.find({});
  if (!columns.length) return { moved: 0, skipped: [] };

  const byId = new Map(columns.map((c) => [c.id, c]));
  const now = Date.now();
  const skipped = [];
  let moved = 0;

  for (const col of columns) {
    const rule = col.rule || {};
    if (!rule.enabled || !rule.targetColumnId || !(rule.triggerDays > 0)) continue;

    // Same two guards the board applies: a rule aimed at its own column would
    // re-move cards forever, and deleting a column does NOT clear rules pointing
    // at it — moving a card to a section with no column drops it off the board
    // with no way to drag it back.
    if (rule.targetColumnId === col.id) {
      skipped.push(`${col.label}: กฎชี้กลับมาที่ตัวเอง`);
      continue;
    }
    if (!byId.has(rule.targetColumnId)) {
      skipped.push(`${col.label}: ไม่พบคอลัมน์ปลายทาง (${rule.targetColumnId})`);
      continue;
    }

    const cutoff = new Date(now - rule.triggerDays * 24 * HOUR_MS);
    // How long the deal has sat in THIS stage — not when the document was last
    // edited. Editing a phone number must not reset the staleness clock.
    // Older records may predate statusChangedAt, so updatedAt is the fallback.
    const stale = await Customer.find({
      section: col.id,
      $or: [
        { statusChangedAt: { $lt: cutoff } },
        { statusChangedAt: { $exists: false }, updatedAt: { $lt: cutoff } },
        { statusChangedAt: null, updatedAt: { $lt: cutoff } }
      ]
    }).select("_id name ownerId section");

    for (const lead of stale) {
      await Customer.updateOne(
        { _id: lead._id },
        { $set: { section: rule.targetColumnId, statusChangedAt: new Date() } }
      );
      moved += 1;
      try {
        await ActivityLog.create({
          ownerId: lead.ownerId,
          actionType: "SALES_CRM",
          description: `ย้ายอัตโนมัติ: ดีล "${lead.name}" ค้างที่ "${col.label}" เกิน ${rule.triggerDays} วัน — ย้ายไป "${byId.get(rule.targetColumnId).label}"`,
          operator: "ระบบ (อัตโนมัติ)"
        });
      } catch (err) {
        // A log failure must not undo a move that already happened.
        console.error("autoMoveLeads: failed to write activity log:", err.message);
      }
    }
  }

  return { moved, skipped };
}

export function startAutoMoveScheduler({ intervalMs = HOUR_MS, startupDelayMs = 30_000 } = {}) {
  const tick = async () => {
    try {
      const { moved, skipped } = await runAutoMove();
      if (moved) console.log(`autoMoveLeads: ย้ายดีลอัตโนมัติ ${moved} รายการ`);
      skipped.forEach((s) => console.warn(`autoMoveLeads: ข้าม — ${s}`));
    } catch (err) {
      // Never let a bad tick kill the server; the next one retries.
      console.error("autoMoveLeads failed:", err);
    }
  };
  // Delay the first run so it does not compete with startup/DB connect.
  setTimeout(tick, startupDelayMs);
  const timer = setInterval(tick, intervalMs);
  // Do not hold the process open just for this timer.
  if (typeof timer.unref === "function") timer.unref();
  return timer;
}

export default startAutoMoveScheduler;
