import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import mongoose from "mongoose";
import ActivityLog from "../src/features/logs/activityLog.model.js";
import { formatStructuredMovement, formatThaiStockDateTime } from "../../frontend/src/lib/stockMovement.js";

const fixture = JSON.parse(await readFile(new URL("../scratch/stock-movement-mock.json", import.meta.url), "utf8"));
const itemById = new Map(fixture.items.map((item) => [item._id, item]));

const selectForItem = (itemId, itemName) => fixture.logs.filter((log) => (
  log.stockMovement?.itemId === itemId
  || (!log.stockMovement && log.description.includes(itemName))
));

test("mock movement rows validate against ActivityLog schema", () => {
  for (const row of fixture.logs.filter((log) => log.stockMovement)) {
    const doc = new ActivityLog({ ...row, itemId: undefined });
    const error = doc.validateSync();
    assert.equal(error, undefined, `${row._id} failed schema validation: ${error?.message}`);
    assert.equal(row.stockMovement.itemId.length, 24);
    assert.ok(itemById.has(row.stockMovement.itemId));
  }
});

test("each structured movement preserves quantity arithmetic and stage", () => {
  for (const row of fixture.logs.filter((log) => log.stockMovement)) {
    const movement = row.stockMovement;
    const delta = movement.afterQuantity - movement.beforeQuantity;
    const expected = movement.direction === "in" ? movement.amount : -movement.amount;
    assert.equal(delta, expected, row._id);
    assert.ok(movement.stage, row._id);
    assert.ok(movement.source, row._id);
    assert.match(formatStructuredMovement(movement), /ก่อนหน้า:/);
  }
});

test("item-id lookup does not mix same-name inventory", () => {
  const ingredientLogs = selectForItem("000000000000000000000101", "Acacia Salicylic Acid");
  assert.equal(ingredientLogs.length, 3);
  assert.ok(ingredientLogs.every((log) => log.stockMovement?.itemId === "000000000000000000000101" || !log.stockMovement));
  const exactPackagingLogs = fixture.logs.filter((log) => log.stockMovement?.itemId === "000000000000000000000102");
  assert.equal(exactPackagingLogs.length, 1);
  assert.ok(exactPackagingLogs.every((log) => log.stockMovement.itemId === "000000000000000000000102"));
});

test("legacy row remains visible through name fallback and is distinguishable", () => {
  const legacy = selectForItem("000000000000000000000101", "Acacia Salicylic Acid").find((log) => !log.stockMovement);
  assert.ok(legacy);
  assert.equal(legacy.stockMovement, undefined);
});

test("production packaging deduction is idempotent", () => {
  const productionRows = fixture.logs.filter((log) => log.stockMovement?.source === "production-packaging");
  assert.equal(productionRows.length, 1);
  const claimed = new Set();
  const claimOnce = (itemId) => claimed.has(itemId) ? false : (claimed.add(itemId), true);
  assert.equal(claimOnce("order-line-mock"), true);
  assert.equal(claimOnce("order-line-mock"), false);
});

test("Thai server timestamp includes Buddhist year and seconds", () => {
  const formatted = formatThaiStockDateTime(fixture.logs[0].createdAt);
  assert.match(formatted, /2569/);
  assert.match(formatted, /น\.$/);
  assert.ok(formatted.includes(":52:14"));
});

test("fixture uses valid ObjectId values for all stock item references", () => {
  for (const item of fixture.items) assert.equal(mongoose.isValidObjectId(item._id), true);
});
