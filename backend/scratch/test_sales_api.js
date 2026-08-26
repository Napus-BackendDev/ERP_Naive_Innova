const runTest = async () => {
  const baseUrl = "http://localhost:5000/api";
  try {
    console.log("1. Logging in via mock-login...");
    const loginRes = await fetch(`${baseUrl}/auth/mock-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    
    if (!loginRes.ok) {
      throw new Error(`Login failed with status ${loginRes.status}`);
    }

    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log("Login successful. Token:", token);

    const headers = { 
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    };

    console.log("\n2. Fetching leads...");
    const fetchRes = await fetch(`${baseUrl}/sales`, { headers });
    const leads = await fetchRes.json();
    console.log(`Fetched ${leads.length} leads.`);

    console.log("\n3. Creating a new lead...");
    const email = `lead.${Date.now()}.${Math.round(Math.random() * 100)}@naiveops.com`;
    const payload = {
      name: "เทสผ่าน API",
      phone: "0888888888",
      address: "123 เทสจังหวัดกรุงเทพ",
      orderType: "lot",
      notes: "เทสจากสคริปต์",
      email: email,
      province: "กรุงเทพ",
      estValue: "50000",
      orderedProducts: [
        {
          formulaName: "Wound Healing Gel 1kg",
          quantityKg: 0,
          quantityPcs: "100",
          packagingType: "ฝากระปุกเจล",
          bottleSize: "50"
        }
      ]
    };

    const createRes = await fetch(`${baseUrl}/sales`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });

    if (!createRes.ok) {
      const errorText = await createRes.text();
      throw new Error(`Create failed with status ${createRes.status}: ${errorText}`);
    }

    const createdLead = await createRes.json();
    console.log("Create successful. Created lead:", createdLead);

    const createdId = createdLead._id;

    console.log("\n4. Deleting the created lead...");
    const deleteRes = await fetch(`${baseUrl}/sales/${createdId}`, {
      method: "DELETE",
      headers
    });

    if (!deleteRes.ok) {
      const errorText = await deleteRes.text();
      throw new Error(`Delete failed with status ${deleteRes.status}: ${errorText}`);
    }

    const deleteResult = await deleteRes.json();
    console.log("Delete successful. Response:", deleteResult);

  } catch (err) {
    console.error("Test failed with error:", err.message);
  }
};

runTest();
