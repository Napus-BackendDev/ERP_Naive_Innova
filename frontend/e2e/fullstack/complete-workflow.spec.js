import { expect, test } from "@playwright/test";
import {
  api,
  findIngredientByName,
  loginViaApi,
  seedIngredient,
  seedMachine,
  unique
} from "./helpers.js";

const formulaPayload = (name, ingredientName, gramsPerKg = 10) => ({
  name,
  color: "#2563eb",
  bom: { [ingredientName]: gramsPerKg },
  phases: { mixing: "ผสมสารตามลำดับ" },
  procedures: ["ตรวจสอบวัตถุดิบก่อนเริ่มผลิต"],
  qcChecklistItems: ["ตรวจลักษณะภายนอก"]
});

async function seedWorkflow(token, { name, ingredientStock = 100, quantityKg = 5, quantityPcs = 30 } = {}) {
  const ingredientName = `${name} วัตถุดิบ`;
  const formulaName = `${name} สูตรหลัก`;
  const ingredient = await seedIngredient(token, ingredientName, ingredientStock);
  const formula = await api(token, "POST", "/bom/formulas", formulaPayload(formulaName, ingredientName));
  const order = await api(token, "POST", "/sales", {
    name,
    email: `${name.replace(/[^a-z0-9]+/gi, ".").toLowerCase()}@e2e.local`,
    phone: "0890000000",
    address: "E2E workflow address",
    orderType: "lot",
    section: "s1",
    orderedProducts: [{
      formulaId: formula._id,
      formulaName,
      quantityKg: String(quantityKg),
      quantityPcs: String(quantityPcs),
      bottleSize: "30",
      fillVolume: "30"
    }]
  });
  const machine = await seedMachine(token, `${name} เครื่องจักร`);
  return { ingredient, ingredientName, formula, formulaName, order, machine, quantityKg, quantityPcs };
}

async function confirmProduction(token, workflow, overrides = {}) {
  return api(token, "POST", "/bom/confirm-production", {
    formulaId: workflow.formula._id,
    quantityKg: workflow.quantityKg,
    productId: "E2E-SKU",
    lotNo: `E2E-${Date.now()}`,
    mfgDate: "2026-10-27",
    expDate: "2028-10-27",
    lotQuantity: workflow.quantityPcs,
    customer: workflow.order.name,
    customerId: workflow.order._id,
    productIndex: 0,
    ...overrides
  });
}

async function openAdminPage(page, path) {
  await page.goto(path);
  await expect(page.locator("body")).not.toContainText("เกิดข้อผิดพลาดในการโหลดข้อมูล");
  await expect(page.locator("body")).not.toContainText("Internal Server Error");
  await page.screenshot({ fullPage: true });
}

test.describe("complete fullstack user workflow", () => {
  test("Basic Flow: Sales → production → stock deduction → Tracking", async ({ page }) => {
    const token = await loginViaApi(page);
    const workflow = await seedWorkflow(token, {
      name: unique("E2E Basic"),
      ingredientStock: 100,
      quantityKg: 5,
      quantityPcs: 30
    });

    await openAdminPage(page, "/admin/sales");
    await expect(page.getByText(workflow.order.name, { exact: true })).toBeVisible();

    const before = await findIngredientByName(token, workflow.ingredientName);
    const lot = await confirmProduction(token, workflow);
    const after = await findIngredientByName(token, workflow.ingredientName);
    expect(Number(after.openingStock)).toBe(Number(before.openingStock) - 50);
    expect(lot.lot.lotNo).toMatch(/^E2E-/);

    await api(token, "PUT", `/production/orders/${workflow.order._id}/status?productIndex=0`, {
      productionStatus: "กำลังผลิต",
      productionStep: 2,
      formulaId: workflow.formula._id
    });
    await api(token, "PUT", `/production/orders/${workflow.order._id}/status?productIndex=0`, {
      productionStatus: "ส่งเก็บเข้าคลัง",
      productionStep: 6
    });

    await openAdminPage(page, "/admin/production");
    await expect(page.getByText(/ระบบควบคุมสถานะลำดับคิว/)).toBeVisible();
    const persisted = await api(token, "GET", `/production/orders/${workflow.order._id}`);
    expect(persisted.orderedProducts[0].productionStatus).toBe("ส่งเก็บเข้าคลัง");

    await openAdminPage(page, "/admin/stock");
    await expect(page.getByText(workflow.ingredientName, { exact: true })).toBeVisible();

    await page.goto("/track/TG-20250001");
    await expect(page.getByRole("heading", { name: "TG-20250001" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "รายการสินค้าในคำสั่งซื้อนี้" })).toBeVisible();
    await expect(page.getByText("กำลังผลิต").first()).toBeVisible();
    await page.screenshot({ fullPage: true });
  });

  test("Alternative Flow: changing formula and machine preserves the order", async ({ page }) => {
    const token = await loginViaApi(page);
    const workflow = await seedWorkflow(token, {
      name: unique("E2E Alternative"),
      ingredientStock: 200,
      quantityKg: 5,
      quantityPcs: 30
    });
    const alternativeIngredientName = `${workflow.order.name} วัตถุดิบใหม่`;
    await seedIngredient(token, alternativeIngredientName, 100);
    const alternativeFormula = await api(
      token,
      "POST",
      "/bom/formulas",
      formulaPayload(`${workflow.order.name} สูตรปรับปรุง`, alternativeIngredientName, 5)
    );
    const alternativeMachine = await seedMachine(token, `${workflow.order.name} เครื่องจักรสำรอง`);
    await confirmProduction(token, workflow);

    await api(token, "PUT", `/production/orders/${workflow.order._id}/status?productIndex=0`, {
      formulaId: alternativeFormula._id,
      productionStatus: "เลือกเครื่องจักร",
      productionStep: 1
    });
    await api(token, "PUT", `/production/orders/${workflow.order._id}/schedule?productIndex=0`, {
      scheduleMachineId: String(alternativeMachine._id),
      scheduleStartDate: "2026-10-27",
      scheduleEndDate: "2026-10-28"
    });

    await openAdminPage(page, "/admin/production");
    await expect(page.getByText(/ระบบควบคุมสถานะลำดับคิว/)).toBeVisible();
    const persisted = await api(token, "GET", `/production/orders/${workflow.order._id}`);
    expect(String(persisted.orderedProducts[0].formulaId)).toBe(String(alternativeFormula._id));
    expect(persisted.orderedProducts[0].scheduleMachineId).toBe(String(alternativeMachine._id));
  });

  test("Exception Flow: insufficient stock blocks production and keeps the order pending", async ({ page }) => {
    const token = await loginViaApi(page);
    const workflow = await seedWorkflow(token, {
      name: unique("E2E Exception"),
      ingredientStock: 10,
      quantityKg: 5,
      quantityPcs: 30
    });

    const response = await page.request.post(`${process.env.E2E_BACKEND_URL || "http://localhost:5100"}/api/bom/confirm-production`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      data: {
        formulaId: workflow.formula._id,
        quantityKg: workflow.quantityKg,
        productId: "E2E-SKU",
        lotNo: `E2E-FAIL-${Date.now()}`,
        mfgDate: "2026-10-27",
        expDate: "2028-10-27",
        lotQuantity: workflow.quantityPcs,
        customer: workflow.order.name,
        customerId: workflow.order._id,
        productIndex: 0
      }
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe("วัตถุดิบสารเคมีไม่เพียงพอ");
    expect(body.errors.join(" ")).toContain(workflow.ingredientName);

    await openAdminPage(page, "/admin/stock");
    await expect(page.getByText(workflow.ingredientName, { exact: true })).toBeVisible();
  });
});
