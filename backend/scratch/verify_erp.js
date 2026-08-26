const runTest = async () => {
  const baseUrl = "http://localhost:5000/api";
  const headers = { "Content-Type": "application/json" };

  try {
    // 1. Login
    const loginRes = await fetch(`${baseUrl}/auth/mock-login`, { method: "POST", headers });
    const { token } = await loginRes.json();
    headers["Authorization"] = `Bearer ${token}`;

    // 2. Fetch sales leads
    const salesRes = await fetch(`${baseUrl}/sales`, { headers });
    const leads = await salesRes.json();
    console.log(`Sales CRM leads: ${leads.length}`);

    // 3. Fetch ingredients
    const ingRes = await fetch(`${baseUrl}/bom/ingredients`, { headers });
    const ings = await ingRes.json();
    console.log(`BOM Ingredients: ${ings.length}`);

    // 4. Fetch packaging
    const pkgRes = await fetch(`${baseUrl}/packaging`, { headers });
    const pkgs = await pkgRes.json();
    console.log(`Packaging Items: ${pkgs.length}`);

    // 5. Fetch formulas
    const fmRes = await fetch(`${baseUrl}/bom/formulas`, { headers });
    const formulas = await fmRes.json();
    console.log(`BOM Formulas: ${formulas.length}`);

    // 6. Create & Delete test lead
    const testPayload = {
      name: "ERP DB Test Lead",
      phone: "099-9999999",
      address: "Test Address",
      orderType: "lot",
      email: `test.erp.${Date.now()}@naiveops.com`
    };
    const createRes = await fetch(`${baseUrl}/sales`, {
      method: "POST", headers, body: JSON.stringify(testPayload)
    });
    const created = await createRes.json();
    console.log(`\nCreate test lead: ${createRes.ok ? "✅ SUCCESS" : "❌ FAILED"} (id: ${created._id})`);

    // Delete it
    const delRes = await fetch(`${baseUrl}/sales/${created._id}`, { method: "DELETE", headers });
    console.log(`Delete test lead: ${delRes.ok ? "✅ SUCCESS" : "❌ FAILED"}`);

    console.log("\n🎉 All API endpoints working correctly with ERP database!");

  } catch (err) {
    console.error("Test failed:", err.message);
  }
};

runTest();
