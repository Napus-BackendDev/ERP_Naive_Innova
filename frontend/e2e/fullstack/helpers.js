import { expect } from "@playwright/test";

export const BACKEND_URL = process.env.E2E_BACKEND_URL || "http://localhost:5100";
export const API_URL = `${BACKEND_URL}/api`;

export function unique(prefix = "E2E") {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix} ${stamp}-${rand}`;
}

export async function api(token, method, path, data) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: data === undefined ? undefined : JSON.stringify(data)
  });
  const text = await res.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} failed (${res.status}): ${text}`);
  }
  return body;
}

export async function loginViaApi(page) {
  const res = await page.request.post(`${API_URL}/auth/mock-login`);
  expect(res.ok()).toBeTruthy();
  const { token, user } = await res.json();
  await page.addInitScript(
    ({ token, user }) => {
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
    },
    { token, user }
  );
  return token;
}

export async function loginViaUi(page) {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill("mock.admin@naiveops.com");
  await page.locator('input[type="password"]').fill("e2e-password");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/admin\/cockpit/);
  const token = await page.evaluate(() => localStorage.getItem("token"));
  expect(token).toBeTruthy();
  return token;
}

export async function seedIngredient(token, name, openingStock = 0) {
  return api(token, "POST", "/bom/ingredients", { name, openingStock });
}

export async function seedMachine(token, name) {
  return api(token, "POST", "/machines", { name });
}

export async function seedLotOrder(token, { name, formulaName = "ผลิตสูตรเอง", quantityPcs = 100 }) {
  return api(token, "POST", "/sales", {
    name,
    email: `${name.replace(/[^a-z0-9]+/gi, ".").toLowerCase()}@e2e.local`,
    phone: "0890000000",
    address: "E2E test address",
    orderType: "lot",
    section: "s1",
    orderedProducts: [
      { formulaName, quantityPcs: String(quantityPcs), bottleSize: "30", fillVolume: "30" }
    ]
  });
}

export async function findLeadByName(token, name) {
  const leads = await api(token, "GET", "/sales");
  return (leads || []).find((lead) => lead.name === name);
}

export async function findIngredientByName(token, name) {
  const ingredients = await api(token, "GET", "/bom/ingredients");
  return (ingredients || []).find((ing) => ing.name === name);
}
