/*
 * Development-only end-to-end smoke test for the durable BOM link flow.
 *
 * Run only against a loopback MongoDB, for example:
 *   MONGODB_URI=mongodb://127.0.0.1:27018/naive_mes_mock node scripts/mock-formula-flow-e2e.js
 *
 * The script creates a timestamped mock namespace and never connects to a
 * remote/Production database.
 */
import "dotenv/config";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { spawnSync } from "node:child_process";
import User from "../src/features/users/user.model.js";
import Role from "../src/features/users/role.model.js";

const uri = process.env.MONGODB_URI || process.env.MONGO_URI || "";
const apiBase = process.env.MOCK_API_BASE || "http://127.0.0.1:5055/api";
const isLoopback = /^mongodb:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//i.test(uri);

if (!uri || !isLoopback) {
  console.error("Refusing to run mock E2E: MONGODB_URI must point to localhost/127.0.0.1.");
  process.exit(2);
}

const runId = String(Date.now());
const nameA = `MOCK-FLOW-${runId}-A`;
const nameB = `MOCK-FLOW-${runId}-B`;
const legacyName = `${nameA}-RENAMED`;
const customerName = `MOCK CUSTOMER ${runId}`;
const legacyCustomerName = `MOCK LEGACY ${runId}`;
const today = new Date().toISOString().slice(0, 10);
const expiry = new Date();
expiry.setFullYear(expiry.getFullYear() + 2);

const checks = [];
const pass = (label) => {
  checks.push({ label, ok: true });
  console.log(`PASS  ${label}`);
};
const check = (condition, label, detail = "") => {
  if (!condition) {
    checks.push({ label, ok: false, detail });
    throw new Error(`FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
  pass(label);
};

async function request(path, options = {}) {
  const headers = { ...(options.body === undefined ? {} : { "content-type": "application/json" }), ...(options.headers || {}) };
  const response = await fetch(`${apiBase}${path}`, { ...options, headers });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  return { response, data };
}

async function call(path, options = {}, expected = [200, 201]) {
  const result = await request(path, options);
  if (!expected.includes(result.response.status)) {
    throw new Error(`${options.method || "GET"} ${path} returned ${result.response.status}: ${JSON.stringify(result.data)}`);
  }
  return result.data;
}

function auth(token, options = {}) {
  return { ...options, headers: { ...(options.headers || {}), authorization: `Bearer ${token}` } };
}

async function main() {
  const login = await call("/auth/mock-login", { method: "POST", body: "{}" });
  const adminToken = login.token;
  check(Boolean(adminToken), "Development mock admin login returns a token");

  const ingredientPayloads = [
    { name: `${nameA}-Water`, openingStock: 100000 },
    { name: `${nameA}-Active`, openingStock: 100000 }
  ];
  for (const payload of ingredientPayloads) {
    await call("/bom/ingredients", auth(adminToken, { method: "POST", body: JSON.stringify(payload) }));
  }
  pass("Mock ingredient stock created with gram-level quantities");

  const formulaA = await call("/bom/formulas", auth(adminToken, {
    method: "POST",
    body: JSON.stringify({
      name: nameA,
      bom: { [`${nameA}-Water`]: 800, [`${nameA}-Active`]: 200 },
      phases: { [`${nameA}-Water`]: "A", [`${nameA}-Active`]: "B" },
      procedures: ["mix", "hold"],
      qcSpec: { ph: "5.5-6.5" },
      qcChecklistItems: [{ key: "appearance", label: "Appearance", type: "passfail" }],
      qcMethod: "Visual + pH"
    })
  }));
  const formulaB = await call("/bom/formulas", auth(adminToken, {
    method: "POST",
    body: JSON.stringify({
      name: nameB,
      bom: { [`${nameA}-Water`]: 1000 },
      phases: { [`${nameA}-Water`]: "A" },
      procedures: ["single phase"]
    })
  }));
  check(formulaA.version === 1 && formulaB.version === 1, "New formulas start at version 1");

  const customer = await call("/sales", auth(adminToken, {
    method: "POST",
    body: JSON.stringify({
      name: customerName,
      orderType: "lot",
      section: "s1",
      orderedProducts: [
        { formulaId: formulaA._id, formulaName: formulaA.name, quantityKg: 2, quantityPcs: 20, fillVolume: 100 },
        { formulaId: formulaB._id, formulaName: formulaB.name, quantityKg: 1, quantityPcs: 10, fillVolume: 100 }
      ]
    })
  }));
  check(customer.orderedProducts?.length === 2, "Multi-product order stores two separate lines");
  check(String(customer.orderedProducts[0].formulaId) === String(formulaA._id)
    && String(customer.orderedProducts[1].formulaId) === String(formulaB._id), "Each order line stores its own formulaId");

  const updatedA = await call(`/bom/formulas/${formulaA._id}`, auth(adminToken, {
    method: "PUT",
    body: JSON.stringify({
      bom: { [`${nameA}-Water`]: 700, [`${nameA}-Active`]: 300 },
      phases: { [`${nameA}-Water`]: "A", [`${nameA}-Active`]: "B" },
      procedures: ["mix", "hold", "cool"]
    })
  }));
  check(updatedA.version === 2, "Editing BOM increments formula version");

  const calc = await call("/bom/calculate", auth(adminToken, {
    method: "POST",
    body: JSON.stringify({ formulaId: formulaA._id, quantityKg: 2 })
  }));
  const calcWater = calc.results.find((row) => row.name === `${nameA}-Water`);
  const calcActive = calc.results.find((row) => row.name === `${nameA}-Active`);
  check(calcWater?.required === 1400 && calcActive?.required === 600, "BOM calculation uses grams per 1 kg without 1000x error");

  const confirmA = await call("/bom/confirm-production", auth(adminToken, {
    method: "POST",
    body: JSON.stringify({
      formulaId: formulaA._id,
      quantityKg: 2,
      productId: `MOCK-PRODUCT-${runId}-A`,
      lotNo: `MOCK-LOT-${runId}-A`,
      mfgDate: today,
      expDate: expiry.toISOString().slice(0, 10),
      lotQuantity: 20,
      customer: customerName,
      customerId: customer._id,
      productIndex: 0
    })
  }));
  check(String(confirmA.lot.formulaId) === String(formulaA._id), "Confirm production writes formulaId to Lot");
  check(confirmA.lot.formulaVersion === 2, "Lot stores the formula version used at confirmation");
  check(confirmA.lot.formulaSnapshot?.bom?.[`${nameA}-Water`] === 700, "Lot stores immutable BOM snapshot in grams/kg");

  const renamedA = await call(`/bom/formulas/${formulaA._id}`, auth(adminToken, {
    method: "PUT",
    body: JSON.stringify({ name: legacyName })
  }));
  check(renamedA.name === legacyName, "Formula rename succeeds through formulaId");

  const changedAfterLot = await call(`/bom/formulas/${formulaA._id}`, auth(adminToken, {
    method: "PUT",
    body: JSON.stringify({ bom: { [`${nameA}-Water`]: 500, [`${nameA}-Active`]: 500 } })
  }));
  check(changedAfterLot.version === 3, "Later BOM edit creates a new version");
  const lotsAfterEdit = await call(`/fg/lots?formulaId=${formulaA._id}&includeDelivered=true`, auth(adminToken));
  const lotAfterEdit = lotsAfterEdit.find((lot) => String(lot._id) === String(confirmA.lot._id));
  check(lotAfterEdit?.formulaSnapshot?.bom?.[`${nameA}-Water`] === 700
    && lotAfterEdit?.formulaVersion === 2, "Existing Lot snapshot does not change after BOM edit");

  const archivePending = await request(`/bom/formulas/${formulaB._id}`, auth(adminToken, { method: "DELETE" }));
  check(archivePending.response.status === 409 && archivePending.data.pendingOrderCount >= 1, "Archive is rejected while an order still references the formula");

  await call("/bom/confirm-production", auth(adminToken, {
    method: "POST",
    body: JSON.stringify({
      formulaId: formulaB._id,
      quantityKg: 1,
      productId: `MOCK-PRODUCT-${runId}-B`,
      lotNo: `MOCK-LOT-${runId}-B`,
      mfgDate: today,
      expDate: expiry.toISOString().slice(0, 10),
      lotQuantity: 10,
      customer: customerName,
      customerId: customer._id,
      productIndex: 1
    })
  }));
  const archivedB = await call(`/bom/formulas/${formulaB._id}`, auth(adminToken, { method: "DELETE" }));
  check(archivedB.formula?.isArchived === true, "Formula archives successfully after pending references are resolved");

  const legacyCustomer = await call("/sales", auth(adminToken, {
    method: "POST",
    body: JSON.stringify({
      name: legacyCustomerName,
      orderType: "lot",
      section: "s1",
      orderedProducts: [{ formulaName: legacyName, quantityKg: 1, quantityPcs: 10, fillVolume: 100 }]
    })
  }));
  check(!legacyCustomer.orderedProducts[0].formulaId, "Legacy mock line starts without formulaId");
  const migration = spawnSync(process.execPath, ["scripts/migrate-formula-links.js", "--apply"], {
    cwd: process.cwd(),
    env: { ...process.env, MONGODB_URI: uri, MONGO_URI: "" },
    encoding: "utf8"
  });
  if (migration.status !== 0) throw new Error(`Migration failed: ${migration.stderr || migration.stdout}`);
  const salesAfterMigration = await call("/sales", auth(adminToken));
  const migrated = salesAfterMigration.find((row) => row.name === legacyCustomerName);
  check(String(migrated?.orderedProducts?.[0]?.formulaId) === String(formulaA._id), "Legacy migration matches by owner + normalized name and fills formulaId");

  await mongoose.connect(uri);
  const userRole = await Role.findOneAndUpdate(
    { name: `Mock User ${runId}` },
    { $set: { name: `Mock User ${runId}`, permissions: [] } },
    { upsert: true, new: true }
  );
  const worker = await User.create({
    googleId: `mock-worker-${runId}`,
    email: `mock.worker.${runId}@example.test`,
    name: `Mock Worker ${runId}`,
    role: userRole._id,
    approvalStatus: "approved"
  });
  const workerToken = jwt.sign({ userId: worker._id, email: worker.email, role: "User" }, process.env.JWT_SECRET || "super_secret", { expiresIn: "1h" });
  await mongoose.disconnect();
  const crossOwner = await request(`/bom/calculate`, auth(workerToken, {
    method: "POST",
    body: JSON.stringify({ formulaId: formulaA._id, quantityKg: 1 })
  }));
  check(crossOwner.response.status === 404, "Non-admin cannot resolve another owner's formula");

  console.log(JSON.stringify({ runId, apiBase, checks: checks.length, status: "PASS" }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  console.error(JSON.stringify({ runId, status: "FAIL", passed: checks.filter((item) => item.ok).length, failed: checks.filter((item) => !item.ok).length }, null, 2));
  process.exitCode = 1;
});
