import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import app from "./testApp.js";
import { asUser, resetDb, seedUsers, startDb, stopDb } from "./helpers.js";
import { makeFormula, makeLot, makeOrder } from "./factories.js";
import ActivityLog from "../../src/features/logs/activityLog.model.js";
import CrmColumn from "../../src/features/sales/crmColumn.model.js";
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

const packagingOrder = async (overrides = {}) => {
  const bottle = await PackagingItem.create({
    ownerId: ctx.user._id,
    name: "Bottle A",
    customer: "ระบบ",
    currentQuantity: 100
  });
  const cap = await PackagingItem.create({
    ownerId: ctx.user._id,
    name: "Cap A",
    customer: "システム",
    currentQuantity: 100
  });
  const label = await PackagingItem.create({
    ownerId: ctx.user._id,
    name: "Label A",
    customer: "システム",
    currentQuantity: 100
  });
  const order = await makeOrder(ctx.user._id, {
    name: "Packaging Order",
    orderedProducts: [{
      formulaName: "Pack Formula",
      quantityPcs: 10,
      packagingItemId: bottle._id,
      nozzleId: cap._id,
      labelItemId: label._id
    }],
    ...overrides
  });
  return { order, bottle, cap, label };
};

describe("Production — uploads", () => {
  test("uploads a small image as an inline data URL", async () => {
    const res = await asUser(request(app).post("/api/production/upload"), ctx.token)
      .attach("file", Buffer.from("fake-png"), { filename: "proof.png", contentType: "image/png" });

    expect(res.status).toBe(200);
    expect(res.body.secure_url).toMatch(/^data:image\/png;base64,/);
  });

  test("rejects non-image uploads", async () => {
    const res = await asUser(request(app).post("/api/production/upload"), ctx.token)
      .attach("file", Buffer.from("plain text"), { filename: "notes.txt", contentType: "text/plain" });
    expect(res.status).toBe(415);
  });

  test("rejects an upload with no file", async () => {
    const res = await asUser(request(app).post("/api/production/upload"), ctx.token).send({});
    expect(res.status).toBe(400);
  });

  test("rejects images larger than 1 MB", async () => {
    const res = await asUser(request(app).post("/api/production/upload"), ctx.token)
      .attach("file", Buffer.alloc(1024 * 1024 + 1), { filename: "big.png", contentType: "image/png" });
    expect(res.status).toBe(413);
  });
});

describe("Production — packaging deduction", () => {
  test("deducts bottle, cap and label once when entering production", async () => {
    const { order, bottle, cap, label } = await packagingOrder();

    const res = await asUser(
      request(app).put(`/api/production/orders/${order._id}/status?productIndex=0`),
      ctx.token
    ).send({ productionStatus: "กำลังผลิต", productionStep: 4 });

    expect(res.status).toBe(200);
    expect(res.body.orderedProducts[0].isStockDeducted).toBe(true);
    expect(res.body.orderedProducts[0].consumedPackaging).toHaveLength(3);
    expect((await PackagingItem.findById(bottle._id)).currentQuantity).toBe(90);
    expect((await PackagingItem.findById(cap._id)).currentQuantity).toBe(90);
    expect((await PackagingItem.findById(label._id)).currentQuantity).toBe(90);
    expect(await ActivityLog.countDocuments({
      "stockMovement.itemType": "packaging",
      "stockMovement.source": "production-packaging"
    })).toBe(3);
  });

  test("does not deduct packaging twice for the same product line", async () => {
    const { order, bottle } = await packagingOrder();

    await asUser(
      request(app).put(`/api/production/orders/${order._id}/status?productIndex=0`),
      ctx.token
    ).send({ productionStatus: "กำลังผลิต", productionStep: 4 });
    expect((await PackagingItem.findById(bottle._id)).currentQuantity).toBe(90);

    const again = await asUser(
      request(app).put(`/api/production/orders/${order._id}/status?productIndex=0`),
      ctx.token
    ).send({ productionStatus: "กำลังผลิต", productionStep: 5 });

    expect(again.status).toBe(200);
    expect((await PackagingItem.findById(bottle._id)).currentQuantity).toBe(90);
    expect(await ActivityLog.countDocuments({
      "stockMovement.itemId": bottle._id,
      "stockMovement.source": "production-packaging"
    })).toBe(1);
  });

  test("resolves a formula link and rejects another owner's formula", async () => {
    const order = await makeOrder(ctx.user._id);
    const mine = await makeFormula(ctx.user._id, { name: "My Formula" });
    const theirs = await makeFormula(ctx.otherUser._id, { name: "Their Formula" });

    const denied = await asUser(
      request(app).put(`/api/production/orders/${order._id}/status`),
      ctx.token
    ).send({ formulaId: String(theirs._id) });
    expect(denied.status).toBe(404);

    const ok = await asUser(
      request(app).put(`/api/production/orders/${order._id}/status`),
      ctx.token
    ).send({ formulaId: String(mine._id) });
    expect(ok.status).toBe(200);
    expect(String(ok.body.formulaId)).toBe(String(mine._id));
  });

  test("cannot update another owner's production order", async () => {
    const order = await makeOrder(ctx.user._id);
    const res = await asUser(
      request(app).put(`/api/production/orders/${order._id}/status`),
      ctx.otherToken
    ).send({ productionStatus: "กำลังผลิต" });
    expect(res.status).toBe(404);
  });
});

describe("Production — warehousing and delivery", () => {
  test("warehousing creates an FG lot and returns the deal to Retention 1", async () => {
    const formula = await makeFormula(ctx.user._id, { name: "Warehouse Formula" });
    await CrmColumn.create({ id: "retention_custom", label: "Retention 1" });
    const order = await makeOrder(ctx.user._id, {
      orderedProducts: [{
        formulaId: formula._id,
        formulaName: "Warehouse Formula",
        quantityPcs: 12
      }]
    });

    const res = await asUser(
      request(app).put(`/api/production/orders/${order._id}/status`),
      ctx.token
    ).send({ productionStatus: "ส่งเก็บเข้าคลัง" });

    expect(res.status).toBe(200);
    expect(res.body.section).toBe("retention_custom");
    expect(res.body.isReturningCustomer).toBe(true);
    expect(res.body.orderedProducts).toHaveLength(0);
    expect(res.body.producedLotId).toBeNull();

    const lot = await ProductLot.findOne({ orderId: order._id, source: "production-qc" });
    expect(lot).toBeTruthy();
    expect(lot.status).toBe("active");
    expect(lot.quantity).toBe(12);
  });

  test("delivery marks the lot delivered and deducts the courier box", async () => {
    const box = await PackagingItem.create({
      ownerId: ctx.user._id,
      name: "Courier Box",
      customer: "システム",
      currentQuantity: 10
    });
    const lot = await makeLot(ctx.user._id, { orderId: null, quantity: 10 });
    const order = await makeOrder(ctx.user._id, {
      orderedProducts: [{
        formulaName: "Deliver Formula",
        quantityPcs: 10,
        producedLotId: lot._id
      }]
    });
    await ProductLot.findByIdAndUpdate(lot._id, { orderId: order._id });

    const res = await asUser(
      request(app).put(`/api/production/orders/${order._id}/status`),
      ctx.token
    ).send({
      productionStatus: "ส่งให้ลูกค้า",
      shippingBox: { itemId: String(box._id), qty: 3 }
    });

    expect(res.status).toBe(200);
    expect((await ProductLot.findById(lot._id)).status).toBe("delivered");
    expect((await PackagingItem.findById(box._id)).currentQuantity).toBe(7);

    const movement = await ActivityLog.findOne({
      "stockMovement.itemId": box._id,
      "stockMovement.source": "delivery"
    });
    expect(movement).toBeTruthy();
    expect(movement.stockMovement.amount).toBe(3);
  });

  test("does not mark a development line's lot as delivered", async () => {
    const lot = await makeLot(ctx.user._id, { quantity: 5 });
    const order = await makeOrder(ctx.user._id, {
      orderType: "develop",
      orderedProducts: [{ formulaName: "R&D Formula", isDevelopment: true, producedLotId: lot._id }]
    });
    await ProductLot.findByIdAndUpdate(lot._id, { orderId: order._id });

    const res = await asUser(
      request(app).put(`/api/production/orders/${order._id}/status`),
      ctx.token
    ).send({ productionStatus: "ส่งให้ลูกค้า" });

    expect(res.status).toBe(200);
    expect((await ProductLot.findById(lot._id)).status).toBe("active");
  });

  test("per-line QC creates a lot for the selected product index", async () => {
    const formula = await makeFormula(ctx.user._id, { name: "Line QC Formula" });
    const order = await makeOrder(ctx.user._id, {
      orderedProducts: [
        { formulaId: formula._id, formulaName: "Line QC Formula", quantityPcs: 7 },
        { formulaId: formula._id, formulaName: "Line QC Formula", quantityPcs: 9 }
      ]
    });

    const res = await asUser(
      request(app).post(`/api/production/orders/${order._id}/qc?productIndex=1`),
      ctx.token
    ).send({ qcPackagingPhoto: "proof" });

    expect(res.status).toBe(200);
    const lineLotId = res.body.orderedProducts[1].producedLotId;
    expect(lineLotId).toBeTruthy();
    const lot = await ProductLot.findById(lineLotId);
    expect(lot.productIndex).toBe(1);
    expect(lot.quantity).toBe(9);
    expect((await Customer.findById(order._id)).producedLotId).toBeUndefined();
  });
});
