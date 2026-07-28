import { EvidenceGatherer } from "./src/lib/scanner/url/gatherer";

async function run() {
  const ev = await EvidenceGatherer.gather("https://google.com/", "google.com");
  console.log(JSON.stringify(ev, null, 2));
}

run();
