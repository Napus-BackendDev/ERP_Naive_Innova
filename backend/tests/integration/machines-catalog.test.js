import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import app from "./testApp.js";
import { asUser, resetDb, seedUsers, startDb, stopDb } from "./helpers.js";
import { makeFormula, makeOrder } from "./factories.js";
import Machine from "../../src/features/machines/machine.model.js";
import Nozzle from "../../src/features/catalog/nozzle.model.js";
import Product from "../../src/features/products/product.model.js";

let ctx;

beforeAll(startDb);
afterAll(stopDb);

beforeEach(async () => {
  await resetDb();
  ctx = await seedUsers();
});

const makeMachine = (ownerId, overrides = {}) => Machine.create({
  ownerId,
  name: overrides.name || "Machine A",
  ...overrides
});

describe("Machines — CRUD and queue", () => {
  test("rejects unauthenticated access", async () => {
    const res = await request(app).get("/api/machines");
    expect(res.status).toBe(401);
  });

  test("rejects a machine without a name", async () => {
    const res = await asUser(request(app).post("/api/machines"), ctx.token).send({ name: "  " });
    expect(res.status).toBe(400);
  });

  test("creates a machine and drops invalid queue ids", async () => {
    const order = await makeOrder(ctx.user._id);

    const res = await asUser(request(app).post("/api/machines"), ctx.token).send({
      name: "Mixer 1",
      color: "#123456",
      order: 2,
      allowedFormulas: ["A"],
      queue: [String(order._id), "not-an-id"]
    });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Mixer 1");
    expect(res.body.queue).toHaveLength(1);
    expect(String(res.body.queue[0].orderId)).toBe(String(order._id));
  });

  test("lists owner machines for a user and all machines for an admin", async () => {
    await makeMachine(ctx.user._id, { name: "Mine" });
    await makeMachine(ctx.otherUser._id, { name: "Theirs" });

    const mine = await asUser(request(app).get("/api/machines"), ctx.token);
    expect(mine.body.map((m) => m.name)).toEqual(["Mine"]);

    const all = await asUser(request(app).get("/api/machines"), ctx.adminToken);
    expect(all.body.map((m) => m.name).sort()).toEqual(["Mine", "Theirs"]);
  });

  test("updates machine fields and preserves the original queue timestamp", async () => {
    const firstOrder = await makeOrder(ctx.user._id);
    const secondOrder = await makeOrder(ctx.user._id);
    const machine = await makeMachine(ctx.user._id, {
      queue: [{ orderId: firstOrder._id, addedAt: new Date("2026-01-01T00:00:00Z") }]
    });

    const res = await asUser(request(app).put(`/api/machines/${machine._id}`), ctx.token).send({
      name: "Renamed",
      color: "#ffffff",
      allowedFormulas: ["B"],
      queue: [String(firstOrder._id), String(secondOrder._id)]
    });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Renamed");
    expect(res.body.color).toBe("#ffffff");
    expect(res.body.allowedFormulas).toEqual(["B"]);
    expect(res.body.queue).toHaveLength(2);
    expect(new Date(res.body.queue[0].addedAt).toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });

  test("replaces the queue through the dedicated queue route", async () => {
    const order = await makeOrder(ctx.user._id);
    const machine = await makeMachine(ctx.user._id);

    const res = await asUser(
      request(app).put(`/api/machines/${machine._id}/queue`),
      ctx.token
    ).send({ queue: [String(order._id)] });

    expect(res.status).toBe(200);
    expect(res.body.queue).toHaveLength(1);
    expect(String(res.body.queue[0].orderId)).toBe(String(order._id));

    const invalid = await asUser(
      request(app).put(`/api/machines/${machine._id}/queue`),
      ctx.token
    ).send({ queue: "not-an-array" });
    expect(invalid.status).toBe(400);
  });

  test("keeps machine update and delete owner-scoped", async () => {
    const machine = await makeMachine(ctx.user._id);
    const update = await asUser(
      request(app).put(`/api/machines/${machine._id}`),
      ctx.otherToken
    ).send({ name: "Hijacked" });
    expect(update.status).toBe(404);

    const denied = await asUser(
      request(app).delete(`/api/machines/${machine._id}`),
      ctx.otherToken
    );
    expect(denied.status).toBe(404);

    const deleted = await asUser(
      request(app).delete(`/api/machines/${machine._id}`),
      ctx.token
    );
    expect(deleted.status).toBe(200);
    expect(await Machine.countDocuments({ _id: machine._id })).toBe(0);
  });
});

describe("Nozzles — catalog mutations", () => {
  test("creates a nozzle and reuses the duplicate name", async () => {
    const first = await asUser(request(app).post("/api/nozzles"), ctx.token).send({
      name: "Pump 1",
      currentQuantity: 5
    });
    expect(first.status).toBe(201);

    const second = await asUser(request(app).post("/api/nozzles"), ctx.token).send({
      name: "Pump 1"
    });
    expect(second.status).toBe(200);
    expect(second.body._id).toBe(first.body._id);
    expect(await Nozzle.countDocuments({ ownerId: ctx.user._id })).toBe(1);
  });

  test("renames a nozzle and keeps edits owner-scoped", async () => {
    const nozzle = await Nozzle.create({ ownerId: ctx.user._id, name: "Old Nozzle" });

    const res = await asUser(request(app).put(`/api/nozzles/${nozzle._id}`), ctx.token).send({
      name: "New Nozzle",
      currentQuantity: 12
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: "New Nozzle", currentQuantity: 12 });

    const denied = await asUser(
      request(app).put(`/api/nozzles/${nozzle._id}`),
      ctx.otherToken
    ).send({ name: "Stolen" });
    expect(denied.status).toBe(404);
  });

  test("refuses to delete a nozzle referenced by a customer order", async () => {
    const nozzle = await Nozzle.create({ ownerId: ctx.user._id, name: "Used Nozzle" });
    await makeOrder(ctx.user._id, {
      orderedProducts: [{ formulaName: "F", nozzleId: nozzle._id }]
    });

    const res = await asUser(request(app).delete(`/api/nozzles/${nozzle._id}`), ctx.token);
    expect(res.status).toBe(400);
    expect(await Nozzle.countDocuments({ _id: nozzle._id })).toBe(1);
  });

  test("deletes an unused nozzle", async () => {
    const nozzle = await Nozzle.create({ ownerId: ctx.user._id, name: "Unused Nozzle" });
    const res = await asUser(request(app).delete(`/api/nozzles/${nozzle._id}`), ctx.token);
    expect(res.status).toBe(200);
    expect(await Nozzle.countDocuments({ _id: nozzle._id })).toBe(0);
  });
});

describe("Products — sample generation", () => {
  test("generates one sample per owner formula and is idempotent", async () => {
    await makeFormula(ctx.user._id, { name: "Sample Formula A" });
    await makeFormula(ctx.user._id, { name: "Sample Formula B" });
    await makeFormula(ctx.otherUser._id, { name: "Other Formula" });

    const first = await asUser(request(app).post("/api/products/generate-samples"), ctx.token);
    expect(first.status).toBe(200);
    expect(first.body.count).toBe(2);
    expect(first.body.products.map((p) => p.sku).sort()).toEqual(["SMP-001", "SMP-002"]);

    const second = await asUser(request(app).post("/api/products/generate-samples"), ctx.token);
    expect(second.status).toBe(200);
    expect(second.body.count).toBe(2);
    expect(await Product.countDocuments({ ownerId: ctx.user._id, isSample: true })).toBe(2);
    expect(await Product.countDocuments({ ownerId: ctx.otherUser._id })).toBe(0);

    const list = await asUser(request(app).get("/api/products?sample=true"), ctx.token);
    expect(list.body).toHaveLength(2);
    expect(list.body.every((p) => p.isSample === true)).toBe(true);
  });

  test("does not list normal products as samples", async () => {
    await Product.create({
      ownerId: ctx.user._id,
      name: "Normal Product",
      isSample: false
    });
    await Product.create({
      ownerId: ctx.user._id,
      name: "Sample Product",
      isSample: true
    });

    const res = await asUser(request(app).get("/api/products?sample=true"), ctx.token);
    expect(res.body.map((p) => p.name)).toEqual(["Sample Product"]);
  });
});
