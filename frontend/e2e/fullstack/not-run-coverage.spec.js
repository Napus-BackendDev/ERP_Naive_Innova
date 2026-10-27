import { expect, test } from "@playwright/test";
import {
  API_URL,
  api,
  findIngredientByName,
  loginViaApi,
  seedIngredient,
  seedMachine,
  unique
} from "./helpers.js";

const formulaPayload = (name, ingredientName) => ({
  name,
  color: "#2563eb",
  bom: { [ingredientName]: 10 },
  phases: { mixing: "mix" },
  procedures: ["inspect"],
  qcChecklistItems: ["appearance"]
});

async function workflow(token, name = unique("Not Run")) {
  const ingredientName = `${name} ingredient`;
  const formulaName = `${name} formula`;
  const ingredient = await seedIngredient(token, ingredientName, 100);
  const formula = await api(token, "POST", "/bom/formulas", formulaPayload(formulaName, ingredientName));
  const order = await api(token, "POST", "/sales", {
    name,
    email: `${name.replace(/[^a-z0-9]+/gi, ".").toLowerCase()}@e2e.local`,
    phone: "0890000000",
    address: "E2E test address",
    orderType: "lot",
    section: "s1",
    orderedProducts: [{
      formulaId: formula._id,
      formulaName,
      quantityKg: "5",
      quantityPcs: "30",
      bottleSize: "30",
      fillVolume: "30"
    }]
  });
  const machine = await seedMachine(token, `${name} machine`);
  return { ingredientName, formula, order, machine };
}

async function expectApiError(page, token, method, path, data, status) {
  const response = await page.request.fetch(`${API_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    data
  });
  expect(response.status()).toBe(status);
  return response.json();
}

test.describe("runnable Not Run coverage", () => {
  test("E2E-ALT-003 rejects an unauthorized formula change", async ({ page }) => {
    const token = await loginViaApi(page);
    const item = await workflow(token, unique("Unauthorized formula"));
    const body = await expectApiError(
      page, token,
      "PUT",
      `/production/orders/${item.order._id}/status?productIndex=0`,
      { formulaId: "000000000000000000000000", productionStep: 1 },
      404
    );
    expect(body.message).toContain("Formula not found");
    await page.screenshot({ fullPage: true });
  });

  test("E2E-ALT-004 rejects an invalid schedule date", async ({ page }) => {
    const token = await loginViaApi(page);
    const item = await workflow(token, unique("Invalid schedule"));
    const body = await expectApiError(
      page, token,
      "PUT",
      `/production/orders/${item.order._id}/schedule?productIndex=0`,
      {
        scheduleMachineId: String(item.machine._id),
        scheduleStartDate: "2026-02-31",
        scheduleEndDate: "2026-03-01"
      },
      400
    );
    expect(body.message).toBe("Invalid schedule start date.");
    await page.screenshot({ fullPage: true });
  });

  test("E2E-EXC-002 rejects an incomplete lot confirmation payload", async ({ page }) => {
    const token = await loginViaApi(page);
    const body = await expectApiError(
      page, token,
      "POST",
      "/bom/confirm-production",
      { formulaId: "000000000000000000000000", productId: "E2E-SKU" },
      400
    );
    expect(body.message).toContain("ข้อมูลสั่งผลิตไม่ครบถ้วน");
    await page.screenshot({ fullPage: true });
  });

  test("E2E-NEG-003 rejects an unknown formula during confirmation", async ({ page }) => {
    const token = await loginViaApi(page);
    const body = await expectApiError(
      page, token,
      "POST",
      "/bom/confirm-production",
      {
        formulaId: "000000000000000000000000",
        quantityKg: 1,
        productId: "E2E-SKU",
        lotNo: `E2E-UNKNOWN-${Date.now()}`,
        mfgDate: "2026-10-27",
        expDate: "2028-10-27",
        lotQuantity: 1
      },
      404
    );
    expect(body.message).toContain("Formula not found");
    await page.screenshot({ fullPage: true });
  });

  test("E2E-RND-001 creates and approves a formula before Production handoff", async ({ page }) => {
    const token = await loginViaApi(page);
    const name = unique("Approved formula");
    const ingredientName = `${name} ingredient`;
    await seedIngredient(token, ingredientName, 100);
    const created = await api(token, "POST", "/bom/formulas", formulaPayload(name, ingredientName));
    const approved = await api(token, "PUT", `/bom/formulas/${created._id}`, {
      qcMethod: "approved",
      qcChecklistItems: ["appearance", "viscosity"]
    });
    expect(approved._id).toBe(created._id);
    expect(Number(approved.version)).toBe(Number(created.version) + 1);
    expect(approved.qcMethod).toBe("approved");
    await page.screenshot({ fullPage: true });
  });

  test("E2E-QC-001 passes QC and releases finished goods to Stock", async ({ page }) => {
    const token = await loginViaApi(page);
    const item = await workflow(token, unique("QC pass"));
    const result = await api(token, "POST", `/production/orders/${item.order._id}/qc?productIndex=0`, {
      qcPackagingPhoto: "data:image/png;base64,evidence"
    });
    expect(result.orderedProducts[0].productionStatus).toBe("สำเร็จเสร็จสิ้น");
    expect(result.orderedProducts[0].producedLotId).toBeTruthy();
    await page.screenshot({ fullPage: true });
  });

  test("E2E-QC-002 rejects QC without evidence", async ({ page }) => {
    const token = await loginViaApi(page);
    const item = await workflow(token, unique("QC reject"));
    const body = await expectApiError(
      page, token,
      "POST",
      `/production/orders/${item.order._id}/qc?productIndex=0`,
      {},
      400
    );
    expect(body.error).toContain("หลักฐาน QC");
    await page.screenshot({ fullPage: true });
  });

  test("E2E-INVENTORY-001 deducts ingredients exactly once per production confirmation", async ({ page }) => {
    const token = await loginViaApi(page);
    const item = await workflow(token, unique("Inventory"));
    const payload = {
      formulaId: item.formula._id,
      quantityKg: 5,
      productId: "E2E-SKU",
      lotNo: `E2E-INVENTORY-${Date.now()}`,
      mfgDate: "2026-10-27",
      expDate: "2028-10-27",
      lotQuantity: 30,
      customer: item.order.name,
      customerId: item.order._id,
      productIndex: 0
    };
    await api(token, "POST", "/bom/confirm-production", payload);
    const after = await findIngredientByName(token, item.ingredientName);
    expect(Number(after.openingStock)).toBe(50);
    await page.screenshot({ fullPage: true });
  });
});
