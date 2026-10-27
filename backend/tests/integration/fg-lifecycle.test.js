import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import app from "./testApp.js";
import { asUser, resetDb, seedUsers, startDb, stopDb } from "./helpers.js";
import { makeFormula, makeLot } from "./factories.js";
import ActivityLog from "../../src/features/logs/activityLog.model.js";
import LotPrefixConfig from "../../src/features/fg/lotPrefixConfig.model.js";
import ProductLot from "../../src/features/fg/productLot.model.js";
import ProductSku from "../../src/features/fg/productSku.model.js";

let ctx;

beforeAll(startDb);
afterAll(stopDb);

beforeEach(async () => {
  await resetDb();
  ctx = await seedUsers();
});

describe("FG — lot receiving", () => {
  test("rejects unauthenticated lot access", async () => {
    const res = await request(app).get("/api/fg/lots");
    expect(res.status).toBe(401);
  });

  test("rejects a receive without the required lot fields", async () => {
    const res = await asUser(request(app).post("/api/fg/recv"), ctx.token).send({
      lotNo: "LOT-ONLY"
    });
    expect(res.status).toBe(400);
    expect(await ProductLot.countDocuments({})).toBe(0);
  });

  test("receives a lot with a formula snapshot and writes an FG movement", async () => {
    const formula = await makeFormula(ctx.user._id, {
      name: "FG Formula",
      bom: { Water: 500, Glycerin: 300 }
    });

    const res = await asUser(request(app).post("/api/fg/recv"), ctx.token).send({
      formulaId: String(formula._id),
      lotNo: "FG-LOT-001",
      mfgDate: "2026-09-01",
      expDate: "2028-09-01",
      quantity: 25,
      customer: "FG Customer"
    });

    expect(res.status).toBe(201);
    expect(res.body.formulaName).toBe("FG Formula");
    expect(res.body.formulaSnapshot.bom).toEqual({ Water: 500, Glycerin: 300 });

    const movement = await ActivityLog.findOne({
      "stockMovement.itemId": res.body._id,
      "stockMovement.itemType": "fgLot"
    });
    expect(movement).toBeTruthy();
    expect(movement.stockMovement).toMatchObject({ direction: "in", amount: 25 });
  });

  test("rejects receive for an archived or unknown formula", async () => {
    const res = await asUser(request(app).post("/api/fg/recv"), ctx.token).send({
      formulaId: "64b000000000000000000000",
      lotNo: "FG-LOT-404",
      mfgDate: "2026-09-01",
      expDate: "2028-09-01",
      quantity: 5
    });
    expect(res.status).toBe(404);
  });

  test("lists lots filtered by formula and hides delivered stock by default", async () => {
    const formula = await makeFormula(ctx.user._id, { name: "Filter Formula" });
    await makeLot(ctx.user._id, { formulaId: formula._id, formulaName: "Filter Formula" });
    await makeLot(ctx.user._id, { formulaName: "Other Formula" });
    await makeLot(ctx.user._id, { formulaName: "Filter Formula", status: "delivered" });

    const res = await asUser(
      request(app).get(`/api/fg/lots?formulaId=${formula._id}`),
      ctx.token
    );
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].formulaName).toBe("Filter Formula");
  });
});

describe("FG — lot edits and deletion", () => {
  test("adjusts a lot quantity and writes a movement log", async () => {
    const lot = await makeLot(ctx.user._id, { quantity: 10 });

    const res = await asUser(request(app).patch(`/api/fg/lots/${lot._id}`), ctx.token).send({
      quantity: 17,
      customer: "Edited Customer"
    });

    expect(res.status).toBe(200);
    expect(res.body.quantity).toBe(17);
    expect(res.body.customer).toBe("Edited Customer");

    const movement = await ActivityLog.findOne({
      "stockMovement.itemId": lot._id,
      "stockMovement.source": "manual-adjustment"
    });
    expect(movement).toBeTruthy();
    expect(movement.stockMovement).toMatchObject({
      direction: "in",
      beforeQuantity: 10,
      afterQuantity: 17
    });
  });

  test("performs a full lot update through PUT", async () => {
    const lot = await makeLot(ctx.user._id, { quantity: 10 });

    const res = await asUser(request(app).put(`/api/fg/lots/${lot._id}`), ctx.token).send({
      lotNo: "FULL-UPDATE-001",
      quantity: 8,
      customer: "Updated Customer",
      mfgDate: "2026-02-01",
      expDate: "2028-02-01"
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      lotNo: "FULL-UPDATE-001",
      quantity: 8,
      customer: "Updated Customer"
    });
  });

  test("keeps lot edits owner-scoped", async () => {
    const lot = await makeLot(ctx.user._id);
    const res = await asUser(request(app).patch(`/api/fg/lots/${lot._id}`), ctx.otherToken).send({
      quantity: 1
    });
    expect(res.status).toBe(404);
  });

  test("deletes a lot but reports missing lots", async () => {
    const lot = await makeLot(ctx.user._id);

    const deleted = await asUser(request(app).delete(`/api/fg/lots/${lot._id}`), ctx.token);
    expect(deleted.status).toBe(200);
    expect(await ProductLot.countDocuments({ _id: lot._id })).toBe(0);

    const missing = await asUser(request(app).delete(`/api/fg/lots/${lot._id}`), ctx.token);
    expect(missing.status).toBe(404);
  });
});

describe("FG — FEFO issue", () => {
  test("issues stock from the earliest-expiring lot first", async () => {
    const first = await makeLot(ctx.user._id, {
      productId: "SKU-FEFO",
      lotNo: "FEFO-EARLY",
      expDate: new Date("2027-01-01"),
      quantity: 5
    });
    const second = await makeLot(ctx.user._id, {
      productId: "SKU-FEFO",
      lotNo: "FEFO-LATE",
      expDate: new Date("2029-01-01"),
      quantity: 20
    });

    const res = await asUser(request(app).post("/api/fg/issue"), ctx.token).send({
      productId: "SKU-FEFO",
      amount: 12
    });

    expect(res.status).toBe(200);
    expect(res.body.details).toEqual([
      { lotNo: "FEFO-EARLY", deducted: 5, remaining: 0 },
      { lotNo: "FEFO-LATE", deducted: 7, remaining: 13 }
    ]);
    expect((await ProductLot.findById(first._id)).quantity).toBe(0);
    expect((await ProductLot.findById(second._id)).quantity).toBe(13);
    expect(await ActivityLog.countDocuments({
      "stockMovement.itemType": "fgLot",
      "stockMovement.source": "fg-issue"
    })).toBe(2);
  });

  test("rejects an issue that exceeds available stock without changing it", async () => {
    const lot = await makeLot(ctx.user._id, { productId: "SKU-SHORT", quantity: 3 });

    const res = await asUser(request(app).post("/api/fg/issue"), ctx.token).send({
      productId: "SKU-SHORT",
      amount: 4
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Insufficient inventory/);
    expect((await ProductLot.findById(lot._id)).quantity).toBe(3);
  });

  test("rejects an invalid issue payload", async () => {
    const res = await asUser(request(app).post("/api/fg/issue"), ctx.token).send({
      productId: "",
      amount: 0
    });
    expect(res.status).toBe(400);
  });
});

describe("FG — prefixes and SKUs", () => {
  test("upserts a lot prefix by formula and lists it", async () => {
    const formula = await makeFormula(ctx.user._id, { name: "Prefix Formula" });

    const created = await asUser(request(app).post("/api/fg/prefix-configs"), ctx.token).send({
      formulaId: String(formula._id),
      formulaName: "Prefix Formula",
      prefix: "pfx",
      description: "first"
    });
    expect(created.status).toBe(200);
    expect(created.body.prefix).toBe("PFX");

    const updated = await asUser(request(app).post("/api/fg/prefix-configs"), ctx.token).send({
      formulaId: String(formula._id),
      formulaName: "Prefix Formula",
      prefix: "NEW",
      description: "second"
    });
    expect(updated.status).toBe(200);
    expect(updated.body.description).toBe("second");
    expect(await LotPrefixConfig.countDocuments({ ownerId: ctx.user._id })).toBe(1);

    const list = await asUser(request(app).get("/api/fg/prefix-configs"), ctx.token);
    expect(list.body.map((c) => c.prefix)).toEqual(["NEW"]);
  });

  test("deletes a prefix config and reports missing ones", async () => {
    const formula = await makeFormula(ctx.user._id, { name: "Delete Prefix" });
    const created = await asUser(request(app).post("/api/fg/prefix-configs"), ctx.token).send({
      formulaId: String(formula._id),
      formulaName: "Delete Prefix",
      prefix: "DEL"
    });

    const deleted = await asUser(
      request(app).delete(`/api/fg/prefix-configs/${created.body._id}`),
      ctx.token
    );
    expect(deleted.status).toBe(200);

    const missing = await asUser(
      request(app).delete(`/api/fg/prefix-configs/${created.body._id}`),
      ctx.token
    );
    expect(missing.status).toBe(404);
  });

  test("lists SKUs owner-scoped", async () => {
    await ProductSku.create({ ownerId: ctx.user._id, id: "MINE-1", name: "Mine" });
    await ProductSku.create({ ownerId: ctx.otherUser._id, id: "THEIRS-1", name: "Theirs" });

    const res = await asUser(request(app).get("/api/fg/skus"), ctx.token);
    expect(res.status).toBe(200);
    expect(res.body.map((s) => s.id)).toEqual(["MINE-1"]);
  });
});
