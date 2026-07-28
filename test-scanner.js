// Native fetch used

async function runTests() {
  const domains = [
    "https://google.com",
    "https://github.com",
    "https://microsoft.com",
    "https://this-domain-should-not-exist-123456789.com"
  ];

  let passed = 0;
  
  for (const url of domains) {
    console.log(`\nTesting ${url}...`);
    try {
      const response = await fetch("http://localhost:3000/api/scans/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });
      
      const data = await response.json();
      
      if (url.includes("this-domain-should-not-exist")) {
        if (response.status === 400 && data.error === "Scan Failed") {
          console.log(`✅ Passed: Non-existent domain correctly failed with: ${data.message}`);
          passed++;
        } else {
          console.error(`❌ Failed: Expected network failure, got status ${response.status} - ${JSON.stringify(data)}`);
        }
      } else {
        if (response.status === 200 && data.threatType === "SAFE" && !data.indicators.includes("invalid-tls")) {
          console.log(`✅ Passed: ${url} evaluated correctly as SAFE without false TLS indicators.`);
          passed++;
        } else {
          console.error(`❌ Failed: ${url} did not meet expectations. Result: ${JSON.stringify(data, null, 2)}`);
        }
      }
    } catch (err) {
      console.error(`❌ Exception testing ${url}:`, err);
    }
  }

  console.log(`\nTests completed: ${passed}/${domains.length} passed.`);
}

runTests();
