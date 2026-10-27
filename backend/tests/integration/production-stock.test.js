import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import app from "./testApp.js";
import { asUser, resetDb, seedUsers, startDb, stopDb } from "./helpers.js";
import ActivityLog from "../../src/features/logs/activityLog.model.js";
import Customer from "../../src/features/customers/customer.model.js";
import PackagingItem from "../../src/features/packaging/packagingItem.model.js";
import ProductLot from "../../src/features/fg/productLot.model.js";

let ctx;

beforeAll(startDb);
afterAll(stopDb);

beforeEach(async () => {
  await resetDb();
  ctx = await seedUsers();
});

const makeOrder = (overrides = {}) =>
  Customer.create({
    ownerId: ctx.user._id,
    name: "Production Customer",
    orderType: "lot",
    section: "s11",
    orderedProducts: [{ formulaName: "Prod Formula", quantityPcs: 10 }],
    ...overrides
  });

const makeLot = (overrides = {}) =>
  ProductLot.create({
    ownerId: ctx.user._id,
    lotNo: `LOT-${Math.random().toString(36).slice(2, 8)}`,
    formulaName: "Prod Formula",
    mfgDate: new Date("2026-07-01"),
    expDate: new Date("2028-07-01"),
    quantity: 10,
    status: "active",
    ...overrides
  });

describe("Production — order visibility", () => {
  test("rejects unauthenticated access", async () => {
    const res = await request(app).get("/api/production/orders");
    expect(res.status).toBe(401);
  });

  test("excludes sample orders and includes lot/development orders for the owner", async () => {
    await makeOrder({ name: "Lot Order", orderType: "lot" });
    await makeOrder({ name: "Dev Order", orderType: "develop", orderedProducts: [] });
    await makeOrder({ name: "Sample Order", orderType: "sample" });
    await Customer.create({ ownerId: ctx.otherUser._id, name: "Other Order", orderType: "lot" });

    const res = await asUser(request(app).get("/api/production/orders"), ctx.token);
    expect(res.status).toBe(200);
    expect(res.body.map((o) => o.name).sort()).toEqual(["Dev Order", "Lot Order"]);
  });

  test("cannot read another owner's production order", async () => {
    const order = await makeOrder();
    const denied = await asUser(
      request(app).get(`/api/production/orders/${order._id}`),
      ctx.otherToken
    );
    expect(denied.status).toBe(404);
  });

  test("returns 404 for a missing production order", async () => {
    const res = await asUser(
      request(app).get("/api/production/orders/64b000000000000000000000"),
      ctx.token
    );
    expect(res.status).toBe(404);
  });
});

describe("Production — status, step and schedule", () => {
  test("rejects an out-of-range production step", async () => {
    const order = await makeOrder();
    const res = await asUser(
      request(app).put(`/api/production/orders/${order._id}/status`),
      ctx.token
    ).send({ productionStep: 9 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/0-6/);
  });

  test("updates status and step and writes a production log", async () => {
    const order = await makeOrder();
    const res = await asUser(
      request(app).put(`/api/production/orders/${order._id}/status`),
      ctx.token
    ).send({ productionStatus: "กำลังผลิต", productionStep: 3 });

    expect(res.status).toBe(200);
    expect(res.body.productionStatus).toBe("กำลังผลิต");
    expect(res.body.productionStep).toBe(3);
    expect(await ActivityLog.countDocuments({ actionType: "PRODUCTION" })).toBe(1);
  });

  test("updates a production step through the dedicated step route", async () => {
    const order = await makeOrder();
    const res = await asUser(
      request(app).put(`/api/production/orders/${order._id}/step`),
      ctx.token
    ).send({ productionStep: 4, productionStatus: "กำลังบรรจุ" });

    expect(res.status).toBe(200);
    expect(res.body.productionStep).toBe(4);
    expect(await ActivityLog.countDocuments({ actionType: "PRODUCTION_STEP" })).toBe(1);
  });

  test("schedules a product line on a machine and swaps a reversed date range", async () => {
    const order = await makeOrder();
    const res = await asUser(
      request(app).put(`/api/production/orders/${order._id}/schedule?productIndex=0`),
      ctx.token
    ).send({
      scheduleMachineId: "m1",
      scheduleStartDate: "2026-07-10",
      scheduleEndDate: "2026-07-08",
      scheduleQueueNo: "2"
    });

    expect(res.status).toBe(200);
    expect(res.body.orderedProducts[0]).toMatchObject({
      scheduleMachineId: "m1",
      scheduleStartDate: "2026-07-08",
      scheduleEndDate: "2026-07-10",
      scheduleQueueNo: 2
    });
  });

  test("clears a product line schedule when no machine is supplied", async () => {
    const order = await makeOrder();
    await asUser(
      request(app).put(`/api/production/orders/${order._id}/schedule?productIndex=0`),
      ctx.token
    ).send({
      scheduleMachineId: "m1",
      scheduleStartDate: "2026-07-08",
      scheduleEndDate: "2026-07-10"
    });

    const res = await asUser(
      request(app).put(`/api/production/orders/${order._id}/schedule?productIndex=0`),
      ctx.token
    ).send({ scheduleMachineId: "" });

    expect(res.status).toBe(200);
    expect(res.body.orderedProducts[0].scheduleMachineId).toBe("");
    expect(res.body.orderedProducts[0].scheduleStartDate).toBe("");
    expect(res.body.orderedProducts[0].scheduleQueueNo).toBeNull();
  });
});

describe("Production — QC and finished goods", () => {
  test("requires at least one QC evidence item", async () => {
    const order = await makeOrder();
    const res = await asUser(
      request(app).post(`/api/production/orders/${order._id}/qc`),
      ctx.token
    ).send({});
    expect(res.status).toBe(400);
  });

  test("passing QC creates a finished-goods lot and is idempotent", async () => {
    const order = await makeOrder();

    const first = await asUser(
      request(app).post(`/api/production/orders/${order._id}/qc`),
      ctx.token
    ).send({ qcPackagingPhoto: "data:image/png;base64,AAAA" });
    expect(first.status).toBe(200);
    expect(first.body.productionStatus).toBe("สำเร็จเสร็จสิ้น");
    expect(first.body.producedLotId).toBeTruthy();

    const second = await asUser(
      request(app).post(`/api/production/orders/${order._id}/qc`),
      ctx.token
    ).send({ qcPackagingPhoto: "data:image/png;base64,AAAA" });
    expect(second.status).toBe(200);
    expect(second.body.producedLotId).toBe(first.body.producedLotId);
    expect(await ProductLot.countDocuments({ orderId: order._id })).toBe(1);
  });

  test("cannot pass QC on another owner's order", async () => {
    const order = await makeOrder();
    const res = await asUser(
      request(app).post(`/api/production/orders/${order._id}/qc`),
      ctx.otherToken
    ).send({ qcPackagingPhoto: "proof" });
    expect(res.status).toBe(404);
  });
});

describe("Stock — packaging transactions", () => {
  test("creates a packaging item and adjusts stock in both directions", async () => {
    const created = await asUser(request(app).post("/api/packaging"), ctx.token).send({
      name: "Bottle 50ml",
      customer: "ระบบ",
      currentQuantity: 0
    });
    expect(created.status).toBe(201);

    const itemId = created.body._id;
    const inbound = await asUser(request(app).post("/api/packaging/tx"), ctx.token).send({
      itemId,
      type: "in",
      amount: 10
    });
    expect(inbound.status).toBe(200);
    expect(inbound.body.item.currentQuantity).toBe(10);

    const outbound = await asUser(request(app).post("/api/packaging/tx"), ctx.token).send({
      itemId,
      type: "out",
      amount: 4
    });
    expect(outbound.body.item.currentQuantity).toBe(6);

    const movement = await ActivityLog.findOne({
      "stockMovement.itemId": itemId,
      "stockMovement.direction": "out"
    });
    expect(movement).toBeTruthy();
    expect(movement.stockMovement.amount).toBe(4);
  });

  test("never drives packaging stock below zero", async () => {
    const item = await PackagingItem.create({
      ownerId: ctx.user._id,
      name: "Cap",
      customer: "ระบบ",
      currentQuantity: 3
    });
    const res = await asUser(request(app).post("/api/packaging/tx"), ctx.token).send({
      itemId: item._id,
      type: "out",
      amount: 99
    });
    expect(res.status).toBe(200);
    expect(res.body.item.currentQuantity).toBe(0);
  });

  test("rejects an invalid packaging transaction", async () => {
    const res = await asUser(request(app).post("/api/packaging/tx"), ctx.token).send({
      itemId: "not-an-id",
      type: "sideways",
      amount: 0
    });
    expect(res.status).toBe(400);
  });

  test("cannot adjust another owner's packaging item", async () => {
    const item = await PackagingItem.create({
      ownerId: ctx.user._id,
      name: "Bottle",
      customer: "ระบบ",
      currentQuantity: 5
    });
    const res = await asUser(request(app).post("/api/packaging/tx"), ctx.otherToken).send({
      itemId: item._id,
      type: "in",
      amount: 1
    });
    expect(res.status).toBe(404);
  });
});

describe("Stock — finished goods lots", () => {
  test("hides delivered lots by default and includes them on request", async () => {
    const active = await makeLot({ status: "active", lotNo: "ACTIVE-1" });
    const delivered = await makeLot({ status: "delivered", lotNo: "DELIVERED-1" });

    const def = await asUser(request(app).get("/api/fg/lots"), ctx.token);
    expect(def.status).toBe(200);
    expect(def.body.map((l) => l.lotNo)).toEqual([active.lotNo]);

    const all = await asUser(
      request(app).get("/api/fg/lots?includeDelivered=true"),
      ctx.token
    );
    expect(all.body.map((l) => l.lotNo).sort()).toEqual([active.lotNo, delivered.lotNo].sort());
  });

  test("is owner-scoped", async () => {
    await makeLot({ lotNo: "OTHER-1", ownerId: ctx.otherUser._id });
    const res = await asUser(request(app).get("/api/fg/lots"), ctx.token);
    expect(res.body).toEqual([]);
  });
});
