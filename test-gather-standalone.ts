import { EvidenceGatherer } from "./src/lib/scanner/url/gatherer";

async function run() {
  const ev = await EvidenceGatherer.gather("https://google.com/", "google.com");
  console.log(ev.tls ? "TLS Found" : "No TLS");
}

run();
