const urls = [
  "https://google.com",
  "https://github.com",
  "https://microsoft.com",
  "https://this-domain-should-not-exist-123456789.com"
];

async function run() {
  for (const url of urls) {
    console.log(`\nTesting ${url}...`);
    try {
      const res = await fetch("http://localhost:3000/api/scans/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });
      
      const json = await res.json();
      console.log(JSON.stringify(json, null, 2));
    } catch (e) {
      console.error("Error:", e.message);
    }
  }
}

run();
