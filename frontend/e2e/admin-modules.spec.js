import { expect, test } from "@playwright/test";

const adminUser = {
  _id: "e2e-admin",
  name: "E2E Admin",
  email: "admin@e2e.local",
  role: "Admin"
};

const normalUser = {
  _id: "e2e-user",
  name: "E2E User",
  email: "user@e2e.local",
  role: "User"
};

const defaultColumns = [
  { id: "s1", label: "Lead", color: "#3b82f6", order: 0 },
  { id: "s2", label: "Sample Sent", color: "#eab308", order: 1 },
  { id: "s6", label: "Follow-up", color: "#f97316", order: 2 },
  { id: "s10", label: "Negotiation", color: "#a855f7", order: 3 },
  { id: "s11", label: "Closed Won", color: "#22c55e", order: 4 }
];

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization,content-type",
  "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS"
};

const json = (route, body, status = 200) =>
  route.fulfill({
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
    body: JSON.stringify(body)
  });

async function setupAdminPage(page, { storedUser = adminUser, meHandler } = {}) {
  await page.addInitScript((user) => {
    localStorage.setItem("token", "e2e-token");
    localStorage.setItem("user", JSON.stringify(user));
  }, storedUser);

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, "");

    if (path === "/auth/me") {
      if (meHandler) return meHandler(route);
      return json(route, { user: storedUser });
    }
    if (path === "/sales/columns") return json(route, defaultColumns);
    if (path === "/users/roles") {
      return json(route, [
        { _id: "role-admin", name: "Admin" },
        { _id: "role-user", name: "User" }
      ]);
    }
    if (path === "/logs") {
      return json(route, {
        items: [],
        total: 0,
        page: 1,
        limit: 100,
        counts: { all: 0, sales: 0, rnd: 0, production: 0, stock: 0, user: 0, other: 0 }
      });
    }

    return json(route, []);
  });
}

const modules = [
  {
    name: "Dashboard",
    path: "/admin/cockpit",
    assert: (page) => expect(page.getByText(/ระบบบริการจัดการโรงงานอัจฉริยะ/)).toBeVisible()
  },
  {
    name: "Sales",
    path: "/admin/sales",
    assert: (page) => expect(page.getByText(/ระบบจัดการข้อมูลการขาย/)).toBeVisible()
  },
  {
    name: "R&D",
    path: "/admin/rnd",
    assert: (page) => expect(page.getByText(/ศูนย์วิจัยและพัฒนาสูตร/)).toBeVisible()
  },
  {
    name: "Production",
    path: "/admin/production",
    assert: (page) => expect(page.getByText(/ระบบควบคุมสถานะลำดับคิว/)).toBeVisible()
  },
  {
    name: "Stock",
    path: "/admin/stock",
    assert: (page) => expect(page.getByText(/คลังสินค้ารวม/)).toBeVisible()
  },
  {
    name: "Users",
    path: "/admin/users",
    assert: (page) => expect(page.getByText(/ระบบจัดการบัญชีผู้ใช้งาน/)).toBeVisible()
  },
  {
    name: "Customer log",
    path: "/admin/customer-log",
    assert: (page) => expect(page.getByText(/บันทึกประวัติลูกค้า \(Customer Log DataTable\)/)).toBeVisible()
  },
  {
    name: "Activity logs",
    path: "/admin/logs",
    assert: (page) => expect(page.getByText(/ระบบบันทึกและตรวจสอบประวัติการปฏิบัติงาน/)).toBeVisible()
  },
  {
    name: "Support",
    path: "/admin/support",
    assert: (page) => expect(page.getByRole("heading", { name: "Support & Helpdesk" })).toBeVisible()
  },
  {
    name: "Settings",
    path: "/admin/settings",
    assert: (page) => expect(page.getByText(/ระบบตั้งค่าพารามิเตอร์/)).toBeVisible()
  }
];

test.describe("admin core modules", () => {
  for (const module of modules) {
    test(`${module.name} loads for an admin`, async ({ page }) => {
      await setupAdminPage(page);
      await page.goto(module.path);
      await module.assert(page);
    });
  }

  test("an admin sees the admin-only Users navigation item", async ({ page }) => {
    await setupAdminPage(page);
    await page.goto("/admin/cockpit");

    await expect(page.getByRole("button", { name: "Users", exact: true })).toBeVisible();
  });

  test("a normal user does not see the Users navigation item", async ({ page }) => {
    await setupAdminPage(page, { storedUser: normalUser });
    await page.goto("/admin/cockpit");

    await expect(page.getByRole("button", { name: "Dashboard", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Users", exact: true })).toHaveCount(0);
  });
});

test.describe("admin access guards", () => {
  test("redirects to login when there is no stored session", async ({ page }) => {
    await page.goto("/admin/sales");
    await expect(page).toHaveURL(/\/login/);
  });

  test("redirects to the pending-approval login when the server rejects the session", async ({ page }) => {
    await setupAdminPage(page, {
      storedUser: normalUser,
      meHandler: (route) =>
        json(route, { code: "PENDING_APPROVAL", message: "First-login approval is required." }, 403)
    });

    await page.goto("/admin/cockpit");
    await expect(page).toHaveURL(/\/login\?pendingApproval=1/);
  });
});
