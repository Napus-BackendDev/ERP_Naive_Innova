import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import app from "./testApp.js";
import { asUser, resetDb, seedUsers, startDb, stopDb } from "./helpers.js";
import ActivityLog from "../../src/features/logs/activityLog.model.js";
import CrmColumn from "../../src/features/sales/crmColumn.model.js";
import Customer from "../../src/features/customers/customer.model.js";
import Product from "../../src/features/products/product.model.js";

let ctx;

beforeAll(startDb);
afterAll(stopDb);

beforeEach(async () => {
  await resetDb();
  ctx = await seedUsers();
});

const makeLead = (overrides = {}) =>
  Customer.create({
    ownerId: ctx.user._id,
    name: "Lead A",
    section: "s1",
    ...overrides
  });

describe("Sales — authentication and listing", () => {
  test("rejects unauthenticated access", async () => {
    const res = await request(app).get("/api/sales");
    expect(res.status).toBe(401);
  });

  test("lists only the owner's leads for a normal user", async () => {
    await makeLead({ name: "Mine" });
    await Customer.create({ ownerId: ctx.otherUser._id, name: "Theirs" });

    const res = await asUser(request(app).get("/api/sales"), ctx.token);
    expect(res.status).toBe(200);
    expect(res.body.map((l) => l.name)).toEqual(["Mine"]);
  });

  test("lists every lead for an admin", async () => {
    await makeLead({ name: "Mine" });
    await Customer.create({ ownerId: ctx.otherUser._id, name: "Theirs" });

    const res = await asUser(request(app).get("/api/sales"), ctx.adminToken);
    expect(res.status).toBe(200);
    expect(res.body.map((l) => l.name).sort()).toEqual(["Mine", "Theirs"]);
  });
});

describe("Sales — create", () => {
  test("creates a lead and normalizes legacy orderedProducts", async () => {
    const res = await asUser(request(app).post("/api/sales"), ctx.token).send({
      name: "New Lead",
      phone: "0812345678",
      section: "s2",
      orderType: "lot",
      orderedProducts: { formulaName: "Legacy Formula", quantityPcs: 10 }
    });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("New Lead");
    expect(res.body.ownerId).toBe(String(ctx.user._id));
    expect(res.body.orderedProducts).toHaveLength(1);
    expect(res.body.orderedProducts[0].formulaName).toBe("Legacy Formula");
  });

  test("reuses an existing customer with the same email instead of duplicating", async () => {
    const first = await asUser(request(app).post("/api/sales"), ctx.token).send({
      name: "Original",
      email: "same@test.local",
      section: "s1"
    });
    expect(first.status).toBe(201);

    const second = await asUser(request(app).post("/api/sales"), ctx.token).send({
      name: "Renamed",
      email: "same@test.local",
      section: "s6"
    });
    expect(second.status).toBe(201);
    expect(second.body._id).toBe(first.body._id);
    expect(second.body.name).toBe("Renamed");
    expect(await Customer.countDocuments({ email: "same@test.local" })).toBe(1);
  });

  test("rejects a sample order when sample stock is insufficient", async () => {
    const product = await Product.create({
      ownerId: ctx.user._id,
      name: "Sample A",
      isSample: true,
      currentQuantity: 2
    });

    const res = await asUser(request(app).post("/api/sales"), ctx.token).send({
      name: "Sample Lead",
      orderType: "sample",
      orderedProducts: [{ productId: String(product._id), quantity: 5 }]
    });

    expect(res.status).toBe(400);
    expect(res.body.shortages[0]).toMatchObject({ requested: 5, available: 2 });
    expect(await Customer.countDocuments({ name: "Sample Lead" })).toBe(0);
  });

  test("deducts sample stock and writes a movement log on a valid sample order", async () => {
    const product = await Product.create({
      ownerId: ctx.user._id,
      name: "Sample B",
      isSample: true,
      currentQuantity: 10
    });

    const res = await asUser(request(app).post("/api/sales"), ctx.token).send({
      name: "Sample Lead",
      orderType: "sample",
      orderedProducts: [{ productId: String(product._id), quantity: 4 }]
    });
    expect(res.status).toBe(201);

    const updated = await Product.findById(product._id);
    expect(updated.currentQuantity).toBe(6);

    const movement = await ActivityLog.findOne({ "stockMovement.itemId": product._id });
    expect(movement).toBeTruthy();
    expect(movement.stockMovement).toMatchObject({ direction: "out", amount: 4 });
  });
});

describe("Sales — update and delete", () => {
  test("updates a lead, changing section and writing an activity log", async () => {
    const lead = await makeLead();

    const res = await asUser(request(app).put(`/api/sales/${lead._id}`), ctx.token).send({
      section: "s11",
      notes: "Closed"
    });

    expect(res.status).toBe(200);
    expect(res.body.section).toBe("s11");
    expect(res.body.notes).toBe("Closed");

    const log = await ActivityLog.findOne({ actionType: "SALES_CRM" });
    expect(log.description).toMatch(/ย้ายสถานะ/);
  });

  test("cannot update another owner's lead", async () => {
    const lead = await makeLead();
    const res = await asUser(request(app).put(`/api/sales/${lead._id}`), ctx.otherToken).send({
      notes: "hijack"
    });
    expect(res.status).toBe(404);
  });

  test("deletes the owner's lead but not another owner's", async () => {
    const lead = await makeLead();

    const denied = await asUser(request(app).delete(`/api/sales/${lead._id}`), ctx.otherToken);
    expect(denied.status).toBe(404);

    const deleted = await asUser(request(app).delete(`/api/sales/${lead._id}`), ctx.token);
    expect(deleted.status).toBe(200);
    expect(await Customer.countDocuments({ _id: lead._id })).toBe(0);
  });
});

describe("Sales — Kanban columns", () => {
  test("returns the default columns when none are configured", async () => {
    const res = await asUser(request(app).get("/api/sales/columns"), ctx.token);
    expect(res.status).toBe(200);
    expect(res.body.map((c) => c.id)).toEqual(["s1", "s2", "s6", "s10", "s11"]);
  });

  test("rejects a non-array column payload", async () => {
    const res = await asUser(request(app).put("/api/sales/columns"), ctx.token).send({
      columns: []
    });
    expect(res.status).toBe(400);
  });

  test("saves and reorders columns", async () => {
    const res = await asUser(request(app).put("/api/sales/columns"), ctx.token).send([
      { id: "s1", label: "Lead", color: "#111111" },
      { id: "s2", label: "Sample Sent", color: "#222222" }
    ]);
    expect(res.status).toBe(200);
    expect(res.body.map((c) => c.id)).toEqual(["s1", "s2"]);
    expect(await CrmColumn.countDocuments({})).toBe(2);
  });
});
