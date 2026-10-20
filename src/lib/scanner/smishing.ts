// Sentinel AI • Smishing & SMS/WhatsApp Threat Forensic Engine
// NLP Panic Scoring, Rogue APK Extraction, Identity Spoofing & Phone Intelligence

import { lookupPhoneIntelligence, PhoneIntelligenceResult } from "./phoneLookup";

export interface SmishingAuditResult {
  messageText: string;
  senderInput?: string;
  category: string;
  riskScore: number; // 0 - 100
  verdict: "CRITICAL_SMISHING" | "SUSPICIOUS" | "SAFE";
  panicScore: number; // 0 - 100
  extractedUrls: string[];
  extractedApks: string[];
  extractedPhoneNumbers: string[];
  detectedImpersonation?: string;
  phoneIntelligence?: PhoneIntelligenceResult;
  forensicSignals: string[];
  safetyAdvisory: string[];
  legalReference: string;
  auditTimestamp: string;
}

// Psychological Urgency / Fear NLP Dictionaries
const PANIC_TRIGGERS = [
  { word: "disconnect", weight: 25 },
  { word: "tonight", weight: 20 },
  { word: "immediately", weight: 20 },
  { word: "blocked", weight: 25 },
  { word: "suspended", weight: 25 },
  { word: "deactivated", weight: 20 },
  { word: "penalty", weight: 18 },
  { word: "fine", weight: 15 },
  { word: "arrest", weight: 30 },
  { word: "legal action", weight: 25 },
  { word: "police", weight: 25 },
  { word: "court", weight: 20 },
  { word: "within 24 hours", weight: 18 },
  { word: "urgent", weight: 15 },
  { word: "last warning", weight: 25 },
  { word: "pan card", weight: 15 },
  { word: "aadhaar", weight: 12 },
  { word: "kyc update", weight: 20 },
  { word: "lottery", weight: 20 },
  { word: "kbc", weight: 25 },
  { word: "prize", weight: 15 },
  { word: "reward", weight: 12 },
  { word: "part time job", weight: 22 },
  { word: "daily income", weight: 20 },
  { word: "challan", weight: 20 },
];

// Target Brand Impersonations in SMS/WhatsApp
const BRAND_PATTERNS = [
  { brand: "State Bank of India (SBI)", pattern: /\b(sbi|yono|state bank)\b/i },
  { brand: "HDFC Bank", pattern: /\b(hdfc|hdfcbank)\b/i },
  { brand: "ICICI Bank", pattern: /\b(icici|imobile)\b/i },
  { brand: "Electricity Board (Power Dept)", pattern: /\b(electricity|power|bijli|bescom|tata power|uppcl|msedcl|bses)\b/i },
  { brand: "India Post (Postal Dept)", pattern: /\b(india post|indiatrading|post office|parcel|customs duty)\b/i },
  { brand: "Netflix", pattern: /\b(netflix|subscription cancelled)\b/i },
  { brand: "Amazon", pattern: /\b(amazon|prime|order dispatch)\b/i },
  { brand: "Income Tax Department", pattern: /\b(income tax|it refund|tax penalty)\b/i },
  { brand: "Traffic Police (e-Challan)", pattern: /\b(echallan|traffic police|parivahan|challan pending)\b/i },
  { brand: "Telegram Job Syndicate", pattern: /\b(telegram|task job|youtube like|review earn)\b/i },
];

export function auditSmishingMessage(messageText: string, senderInput?: string): SmishingAuditResult {
  const text = messageText.trim();
  const lower = text.toLowerCase();
  const forensicSignals: string[] = [];
  const safetyAdvisory: string[] = [];

  // 1. Extract URLs and Shortlinks
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.(?:xyz|top|work|click|fit|buzz|link|ru|tk|ga|cf|gq|club|online|site)\b[^\s]*)/gi;
  const rawUrls = text.match(urlRegex) || [];
  const extractedUrls = Array.from(new Set(rawUrls));

  // 2. Extract Rogue Android APK references
  const apkRegex = /([a-zA-Z0-9_-]+\.apk\b|download(?:ing)?\s+app|install\s+(?:the\s+)?app)/gi;
  const rawApks = text.match(apkRegex) || [];
  const extractedApks = Array.from(new Set(rawApks));

  // 3. Extract Phone Numbers inside message body
  const phoneRegex = /(?:\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b/g;
  const rawPhones = text.match(phoneRegex) || [];
  const extractedPhoneNumbers = Array.from(new Set(rawPhones.map((p) => p.replace(/[\s-]/g, ""))));

  // Determine which phone number to inspect (sender or first phone inside text)
  const targetPhoneOrHeader = senderInput?.trim() || extractedPhoneNumbers[0] || "";
  let phoneIntelligence: PhoneIntelligenceResult | undefined = undefined;

  if (targetPhoneOrHeader) {
    phoneIntelligence = lookupPhoneIntelligence(targetPhoneOrHeader, text);
  }

  // 4. Compute Psychological Panic Score (NLP)
  let rawPanic = 0;
  for (const trigger of PANIC_TRIGGERS) {
    if (lower.includes(trigger.word)) {
      rawPanic += trigger.weight;
      forensicSignals.push(`Psychological fear/urgency anchor detected: "${trigger.word}"`);
    }
  }
  const panicScore = Math.min(100, rawPanic);

  // 5. Detect Target Brand Impersonated
  let detectedImpersonation: string | undefined = undefined;
  for (const b of BRAND_PATTERNS) {
    if (b.pattern.test(text)) {
      detectedImpersonation = b.brand;
      forensicSignals.push(`Brand Impersonation Target Identified: ${b.brand}`);
      break;
    }
  }

  // 6. Determine Scam Category
  let category = "Suspicious Unsolicited Broadcast";
  if (lower.includes("electric") || lower.includes("power") || lower.includes("bijli") || lower.includes("bill")) {
    category = "Electricity / Utility Disconnection Fraud";
  } else if (lower.includes("sbi") || lower.includes("yono") || lower.includes("hdfc") || lower.includes("kyc") || lower.includes("pan card")) {
    category = "Banking KYC & Account Deactivation Trap";
  } else if (lower.includes("parcel") || lower.includes("package") || lower.includes("india post") || lower.includes("address")) {
    category = "Courier & India Post Delivery Phishing";
  } else if (lower.includes("job") || lower.includes("task") || lower.includes("earn") || lower.includes("telegram")) {
    category = "Work-From-Home / Part-Time Job Scam";
  } else if (lower.includes("challan") || lower.includes("traffic") || lower.includes("court")) {
    category = "Traffic e-Challan Fake APK Extortion";
  } else if (lower.includes("kbc") || lower.includes("lottery") || lower.includes("won") || lower.includes("prize")) {
    category = "Lottery / Lucky Draw Advance-Fee Fraud";
  }

  // 7. Calculate Consolidated Risk Score (0 - 100)
  let riskScore = 15; // baseline clean message

  // URL presence penalties
  if (extractedUrls.length > 0) {
    riskScore += 25;
    forensicSignals.push(`Embedded suspicious web link found: ${extractedUrls.join(", ")}`);
    if (extractedUrls.some((u) => u.includes(".xyz") || u.includes(".top") || u.includes(".click") || u.includes("bit.ly") || u.includes("tinyurl"))) {
      riskScore += 20;
      forensicSignals.push("Shortener / High-abuse TLD detected designed to bypass SMS filters.");
    }
  }

  // APK payload penalties
  if (extractedApks.length > 0) {
    riskScore += 35;
    forensicSignals.push(`HIGH CRITICAL: Message prompts user to install unverified Android APK package (${extractedApks.join(", ")}).`);
  }

  // Panic score impact
  if (panicScore >= 50) {
    riskScore += 20;
  } else if (panicScore >= 25) {
    riskScore += 10;
  }

  // Sender phone / header intelligence impact
  if (phoneIntelligence) {
    if (phoneIntelligence.lineType === "VOIP_VIRTUAL") {
      riskScore += 35;
      forensicSignals.push("Message originates from untraceable Virtual VoIP route.");
    }

    if (phoneIntelligence.isRegisteredBankHeader) {
      // Legitimate TRAI bank header with no rogue URLs
      if (extractedUrls.length === 0 && extractedApks.length === 0) {
        riskScore = 5;
        forensicSignals.push("Genuine verified TRAI DLT header registered to financial institution.");
      }
    } else if (detectedImpersonation && phoneIntelligence.lineType === "MOBILE") {
      // Message claims to be from Bank or Electricity board, but came from a personal 10-digit mobile number!
      riskScore = Math.max(riskScore, 95);
      forensicSignals.push("CRITICAL FRAUD: Message claims to represent an institution, but originates from a personal 10-digit mobile SIM.");
    }

    if (phoneIntelligence.spamScore >= 80) {
      riskScore = Math.max(riskScore, phoneIntelligence.spamScore);
      forensicSignals.push(`Caller Intelligence: Number has ${phoneIntelligence.spamReportsCount} active fraud complaints.`);
    }
  }

  riskScore = Math.min(100, Math.max(0, riskScore));

  // 8. Verdict Assignment
  let verdict: "CRITICAL_SMISHING" | "SUSPICIOUS" | "SAFE" = "SAFE";
  if (riskScore >= 75) {
    verdict = "CRITICAL_SMISHING";
  } else if (riskScore >= 35) {
    verdict = "SUSPICIOUS";
  }

  // 9. Safety Advisory Playbook
  if (verdict === "CRITICAL_SMISHING") {
    safetyAdvisory.push("🚨 DO NOT CALL back any phone numbers mentioned in the message.");
    safetyAdvisory.push("🚫 NEVER install any .apk file downloaded via SMS or WhatsApp.");
    safetyAdvisory.push("🔒 Official banks and electricity boards never issue disconnection threats from 10-digit numbers.");
    safetyAdvisory.push("📞 Report immediately to National Cyber Crime Helpline: 1930 or visit cybercrime.gov.in");
    safetyAdvisory.push("🛡️ Forward fraudulent SMS to 1909 (Do Not Disturb registry) and block the sender.");
  } else if (verdict === "SUSPICIOUS") {
    safetyAdvisory.push("⚠️ Exercise caution before interacting with embedded links.");
    safetyAdvisory.push("🔍 Verify sender credentials directly with the official mobile banking app or utility portal.");
  } else {
    safetyAdvisory.push("✅ No overt social engineering or malicious APK indicators detected.");
  }

  return {
    messageText: text,
    senderInput: targetPhoneOrHeader || undefined,
    category,
    riskScore,
    verdict,
    panicScore,
    extractedUrls,
    extractedApks,
    extractedPhoneNumbers,
    detectedImpersonation,
    phoneIntelligence,
    forensicSignals,
    safetyAdvisory,
    legalReference: "Indian Information Technology Act 2000 (Section 66D: Impersonation by Computer Resource) & IPC Section 419/420",
    auditTimestamp: new Date().toISOString(),
  };
}
