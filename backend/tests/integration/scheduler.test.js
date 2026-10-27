import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import { resetDb, seedUsers, startDb, stopDb } from "./helpers.js";
import { runAutoMove } from "../../src/jobs/autoMoveLeads.js";
import ActivityLog from "../../src/features/logs/activityLog.model.js";
import CrmColumn from "../../src/features/sales/crmColumn.model.js";
import Customer from "../../src/features/customers/customer.model.js";

let ctx;

beforeAll(startDb);
afterAll(stopDb);

beforeEach(async () => {
  await resetDb();
  ctx = await seedUsers();
});

const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

const makeColumn = (overrides = {}) => CrmColumn.create({
  id: overrides.id || "stale_col",
  label: overrides.label || "Lead",
  order: overrides.order || 0,
  rule: {
    enabled: true,
    triggerDays: 7,
    targetColumnId: "retention_1",
    ...(overrides.rule || {})
  },
  ...overrides
});

const makeLead = (overrides = {}) => Customer.create({
  ownerId: ctx.user._id,
  name: overrides.name || "Lead",
  section: "stale_col",
  ...overrides
});

describe("autoMoveLeads — rule evaluation", () => {
  test("does nothing when no CRM columns exist", async () => {
    const result = await runAutoMove();
    expect(result).toEqual({ moved: 0, skipped: [] });
  });

  test("ignores columns with the rule disabled", async () => {
    await makeColumn({ rule: { enabled: false, triggerDays: 7, targetColumnId: "retention_1" } });
    await makeColumn({ id: "retention_1", label: "Retention 1", rule: {} });
    await makeLead({ statusChangedAt: daysAgo(30) });

    const result = await runAutoMove();
    expect(result.moved).toBe(0);
    expect((await Customer.findOne({ name: "Lead" })).section).toBe("stale_col");
  });

  test("skips a rule that targets its own column", async () => {
    await makeColumn({
      rule: { enabled: true, triggerDays: 7, targetColumnId: "stale_col" }
    });
    await makeLead({ statusChangedAt: daysAgo(30) });

    const result = await runAutoMove();
    expect(result.moved).toBe(0);
    expect(result.skipped[0]).toMatch(/กฎชี้กลับมาที่ตัวเอง/);
  });

  test("skips a rule whose target column no longer exists", async () => {
    await makeColumn({
      rule: { enabled: true, triggerDays: 7, targetColumnId: "deleted_column" }
    });
    await makeLead({ statusChangedAt: daysAgo(30) });

    const result = await runAutoMove();
    expect(result.moved).toBe(0);
    expect(result.skipped[0]).toMatch(/ไม่พบคอลัมน์ปลายทาง/);
  });
});

describe("autoMoveLeads — moving stale leads", () => {
  test("moves a stale lead to the target column and writes an activity log", async () => {
    await makeColumn();
    await makeColumn({ id: "retention_1", label: "Retention 1", rule: {} });
    const lead = await makeLead({ name: "Stale Lead", statusChangedAt: daysAgo(10) });

    const result = await runAutoMove();

    expect(result.moved).toBe(1);
    const updated = await Customer.findById(lead._id);
    expect(updated.section).toBe("retention_1");
    expect(updated.statusChangedAt.getTime()).toBeGreaterThan(daysAgo(1).getTime());

    const log = await ActivityLog.findOne({ actionType: "SALES_CRM" });
    expect(log).toBeTruthy();
    expect(log.description).toContain("Stale Lead");
    expect(log.operator).toBe("ระบบ (อัตโนมัติ)");
  });

  test("leaves a fresh lead in place", async () => {
    await makeColumn();
    await makeColumn({ id: "retention_1", label: "Retention 1", rule: {} });
    const lead = await makeLead({ name: "Fresh Lead", statusChangedAt: daysAgo(1) });

    const result = await runAutoMove();
    expect(result.moved).toBe(0);
    expect((await Customer.findById(lead._id)).section).toBe("stale_col");
  });

  test("falls back to updatedAt when statusChangedAt is missing", async () => {
    await makeColumn();
    await makeColumn({ id: "retention_1", label: "Retention 1", rule: {} });
    const lead = await makeLead({ name: "Legacy Lead" });

    await Customer.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(lead._id) },
      { $unset: { statusChangedAt: "" }, $set: { updatedAt: daysAgo(20) } }
    );

    const result = await runAutoMove();
    expect(result.moved).toBe(1);
    expect((await Customer.findById(lead._id)).section).toBe("retention_1");
  });

  test("moves only leads in the source column", async () => {
    await makeColumn();
    await makeColumn({ id: "retention_1", label: "Retention 1", rule: {} });
    await makeLead({ name: "Stale Lead", statusChangedAt: daysAgo(10) });
    await makeLead({ name: "Other Lead", section: "manual_col", statusChangedAt: daysAgo(10) });

    const result = await runAutoMove();
    expect(result.moved).toBe(1);
    expect((await Customer.findOne({ name: "Other Lead" })).section).toBe("manual_col");
  });
});
