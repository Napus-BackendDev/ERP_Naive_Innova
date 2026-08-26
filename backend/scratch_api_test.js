async function testApi() {
  try {
    console.log("Logging in...");
    const loginRes = await fetch("http://localhost:5000/api/auth/mock-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    
    if (!loginRes.ok) {
      const txt = await loginRes.text();
      throw new Error(`Login failed with status ${loginRes.status}: ${txt}`);
    }
    
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log("Logged in successfully. Token obtained.");

    const columnsPayload = [
      { id: "s1", label: "Lead", isDefault: true },
      { id: "s2", label: "Sample Sent", isDefault: true },
      { id: "s6", label: "Follow-up", isDefault: true },
      { id: "s10", label: "Negotiation", isDefault: true },
      { id: "s11", label: "Closed Won", isDefault: true }
    ];

    console.log("Sending PUT /api/sales/columns...");
    const res = await fetch("http://localhost:5000/api/sales/columns", {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}` 
      },
      body: JSON.stringify(columnsPayload)
    });
    
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Response:", data);
  } catch (err) {
    console.error("API ERROR DETECTED:", err.message);
  }
}

testApi();
