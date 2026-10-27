import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import app from "./testApp.js";
import { asUser, resetDb, seedUsers, startDb, stopDb } from "./helpers.js";
import ActivityLog from "../../src/features/logs/activityLog.model.js";
import Customer from "../../src/features/customers/customer.model.js";
import ProductLot from "../../src/features/fg/productLot.model.js";
import SupportTicket from "../../src/features/support/support.model.js";

let ctx;

beforeAll(startDb);
afterAll(stopDb);

beforeEach(async () => {
  await resetDb();
  ctx = await seedUsers();
});

const addLog = (overrides = {}) =>
  ActivityLog.create({
    ownerId: ctx.user._id,
    actionType: "SALES_CRM",
    description: "Deal created",
    operator: "Test User",
    ...overrides
  });

describe("Activity Logs — listing, search and filters", () => {
  test("rejects unauthenticated access", async () => {
    const res = await request(app).get("/api/logs");
    expect(res.status).toBe(401);
  });

  test("returns an envelope with totals and category counts", async () => {
    await addLog({ actionType: "SALES_CRM" });
    await addLog({ actionType: "STOCK", description: "Stock adjusted" });
    await addLog({ actionType: "USER", description: "User updated" });

    const res = await asUser(request(app).get("/api/logs"), ctx.token);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(3);
    expect(res.body.total).toBe(3);
    expect(res.body.counts).toMatchObject({ all: 3, sales: 1, stock: 1, user: 1, production: 0 });
  });

  test("filters by category", async () => {
    await addLog({ actionType: "SALES_CRM" });
    await addLog({ actionType: "STOCK" });
    await addLog({ actionType: "FG", description: "Finished goods received" });

    const res = await asUser(request(app).get("/api/logs?category=stock"), ctx.token);
    expect(res.status).toBe(200);
    expect(res.body.items.map((l) => l.actionType).sort()).toEqual(["FG", "STOCK"]);
    expect(res.body.counts.stock).toBe(2);
  });

  test("searches descriptions and escapes regex characters", async () => {
    await addLog({ description: "Adjustment (special) for Aqua" });
    await addLog({ description: "Unrelated row" });

    const res = await asUser(
      request(app).get("/api/logs").query({ q: "(special)" }),
      ctx.token
    );
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].description).toMatch(/special/);
  });

  test("is owner-scoped for normal users but global for admins", async () => {
    await addLog({ ownerId: ctx.user._id, description: "Mine" });
    await addLog({ ownerId: ctx.otherUser._id, description: "Theirs" });

    const mine = await asUser(request(app).get("/api/logs"), ctx.token);
    expect(mine.body.total).toBe(1);
    expect(mine.body.items[0].description).toBe("Mine");

    const all = await asUser(request(app).get("/api/logs"), ctx.adminToken);
    expect(all.body.total).toBe(2);
  });

  test("applies inclusive date range filters", async () => {
    const oldLog = await addLog({ description: "Old row" });
    await ActivityLog.collection.updateOne(
      { _id: oldLog._id },
      { $set: { createdAt: new Date("2025-01-15T10:00:00.000Z") } }
    );
    await addLog({ description: "Recent row" });

    const res = await asUser(
      request(app).get("/api/logs").query({ from: "2026-01-01", to: "2026-12-31" }),
      ctx.token
    );
    expect(res.body.items.map((l) => l.description)).toEqual(["Recent row"]);
  });

  test("an invalid stock item id yields an empty result instead of a 500", async () => {
    await addLog();
    const res = await asUser(
      request(app).get("/api/logs").query({ stockItemId: "not-an-object-id" }),
      ctx.token
    );
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
  });

  test("creates a log entry owned by the caller", async () => {
    const res = await asUser(request(app).post("/api/logs"), ctx.token).send({
      actionType: "STOCK",
      description: "Manual entry"
    });
    expect(res.status).toBe(201);
    expect(res.body.ownerId).toBe(String(ctx.user._id));
    expect(res.body.operator).toBe("Test User");
  });
});

describe("Support — tickets", () => {
  test("rejects unauthenticated access", async () => {
    const res = await request(app).get("/api/support");
    expect(res.status).toBe(401);
  });

  test("rejects a ticket without a title", async () => {
    const res = await asUser(request(app).post("/api/support"), ctx.token).send({
      title: "   "
    });
    expect(res.status).toBe(400);
  });

  test("creates a ticket, defaults an invalid severity and mirrors to the activity log", async () => {
    const res = await asUser(request(app).post("/api/support"), ctx.token).send({
      title: "  Cannot export report  ",
      severity: "urgent",
      description: "It fails"
    });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe("Cannot export report");
    expect(res.body.severity).toBe("low");
    expect(res.body.status).toBe("open");
    expect(res.body.reportedBy).toBe("Test User");

    const log = await ActivityLog.findOne({ actionType: "SUPPORT" });
    expect(log.description).toMatch(/Cannot export report/);
  });

  test("shows only the owner's tickets to a normal user, all to an admin", async () => {
    await SupportTicket.create({ ownerId: ctx.user._id, title: "Mine" });
    await SupportTicket.create({ ownerId: ctx.otherUser._id, title: "Theirs" });

    const mine = await asUser(request(app).get("/api/support"), ctx.token);
    expect(mine.body.map((t) => t.title)).toEqual(["Mine"]);

    const all = await asUser(request(app).get("/api/support"), ctx.adminToken);
    expect(all.body.map((t) => t.title).sort()).toEqual(["Mine", "Theirs"]);
  });
});

describe("Customer Log — traceability read model", () => {
  test("rejects unauthenticated access", async () => {
    const res = await request(app).get("/api/customer-log");
    expect(res.status).toBe(401);
  });

  test("returns only customers with activity for the owner, including lots", async () => {
    const customer = await Customer.create({
      ownerId: ctx.user._id,
      name: "Customer A",
      orderedProducts: [{ formulaName: "Formula A", quantityPcs: 20 }]
    });
    await Customer.create({ ownerId: ctx.user._id, name: "Empty Customer" });
    await Customer.create({
      ownerId: ctx.otherUser._id,
      name: "Other Customer",
      orderedProducts: [{ formulaName: "Formula B" }]
    });

    await ProductLot.create({
      ownerId: ctx.user._id,
      orderId: customer._id,
      lotNo: "LOT-A-1",
      formulaName: "Formula A",
      mfgDate: new Date("2026-07-01"),
      expDate: new Date("2028-07-01"),
      quantity: 20,
      status: "active"
    });

    const res = await asUser(request(app).get("/api/customer-log"), ctx.token);
    expect(res.status).toBe(200);
    expect(res.body.map((r) => r.name)).toEqual(["Customer A"]);
    expect(res.body[0].orderedProducts[0].formulaName).toBe("Formula A");
    expect(res.body[0].lots).toHaveLength(1);
    expect(res.body[0].lots[0].lotNo).toBe("LOT-A-1");
  });

  test("shows every customer with activity to an admin", async () => {
    await Customer.create({
      ownerId: ctx.user._id,
      name: "Customer A",
      orderedProducts: [{ formulaName: "Formula A" }]
    });
    await Customer.create({
      ownerId: ctx.otherUser._id,
      name: "Customer B",
      orderedProducts: [{ formulaName: "Formula B" }]
    });

    const res = await asUser(request(app).get("/api/customer-log"), ctx.adminToken);
    expect(res.status).toBe(200);
    expect(res.body.map((r) => r.name).sort()).toEqual(["Customer A", "Customer B"]);
  });
});
