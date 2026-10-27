import { expect, test } from "@playwright/test";

test.describe("public order tracking", () => {
  test("shows a validation message when the tag is empty", async ({ page }) => {
    await page.goto("/track");

    await page.getByRole("button", { name: "ค้นหา" }).click();

    await expect(page.getByRole("alert").filter({ hasText: "กรุณากรอกเลขที่แท็ก" }))
      .toHaveText("กรุณากรอกเลขที่แท็ก หรือเลขที่งานก่อนค้นหา");
    await expect(page).toHaveURL(/\/track$/);
  });

  test("uppercases the tag and opens the tracking detail page", async ({ page }) => {
    await page.goto("/track");

    const input = page.getByLabel("เลขที่แท็ก / เลขที่งาน");
    await input.fill("tg-20250001");
    await page.getByRole("button", { name: "ค้นหา" }).click();

    await expect(page).toHaveURL(/\/track\/TG-20250001$/);
    await expect(page.getByRole("heading", { name: "TG-20250001" })).toBeVisible();
    await expect(page.getByText("หจก. รุ่งเรืองอุตสาหกรรม (สำนักงานใหญ่)")).toBeVisible();
  });

  test("tracking detail lists the ordered products", async ({ page }) => {
    await page.goto("/track/TG-20250001");

    await expect(page.getByRole("heading", { name: "รายการสินค้าในคำสั่งซื้อนี้" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "ฉลาก Tag อลูมิเนียมพรีเมียม 50×50mm" })).toBeVisible();
  });
});

test.describe("login screen", () => {
  test("explains an expired session to the user", async ({ page }) => {
    await page.goto("/login?expired=1");

    await expect(page.getByText("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่")).toBeVisible();
    await expect(page.getByRole("button", { name: /Google Account/ })).toBeVisible();
  });
});
