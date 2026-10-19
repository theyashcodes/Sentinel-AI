export interface EmailHop {
  hopIndex: number;
  fromServer?: string;
  byServer?: string;
  ipAddress?: string;
  timestamp?: string;
}

export interface SecuritySeals {
  spf: "PASS" | "FAIL" | "SOFTFAIL" | "NEUTRAL" | "NONE";
  spfDetail?: string;
  dkim: "PASS" | "FAIL" | "NONE";
  dkimDomain?: string;
  dmarc: "PASS" | "FAIL" | "NONE";
  dmarcPolicy?: string;
}

export interface SenderAnalysis {
  displayName?: string;
  fromEmail?: string;
  fromDomain?: string;
  returnPath?: string;
  returnPathDomain?: string;
  replyTo?: string;
  replyToDomain?: string;
  isDisplayNameSpoofed: boolean;
  spoofedBrand?: string;
  isDomainMismatch: boolean;
}

export interface EmailForensicReport {
  subject: string;
  dateSent?: string;
  messageId?: string;
  verdict: "CRITICAL_PHISHING" | "SUSPICIOUS" | "AUTHENTIC_LEGITIMATE";
  riskScore: number; // 0 - 100
  sender: SenderAnalysis;
  securitySeals: SecuritySeals;
  hops: EmailHop[];
  urgencySignals: string[];
  extractedLinks: Array<{
    url: string;
    domain: string;
    isSuspicious: boolean;
  }>;
  summaryExplanation: string;
  forensicEvidence: Array<{
    category: "SENDER_SPOOFING" | "SECURITY_SEALS" | "RELAY_TRAIL" | "SOCIAL_ENGINEERING" | "EMBEDDED_LINKS";
    status: "CRITICAL" | "WARNING" | "VERIFIED" | "INFO";
    detail: string;
  }>;
}

const BRAND_KEYWORDS: Record<string, string[]> = {
  PayPal: ["paypal"],
  "State Bank of India (SBI)": ["sbi", "state bank"],
  Netflix: ["netflix"],
  Apple: ["apple", "icloud"],
  Microsoft: ["microsoft", "office365", "outlook"],
  Google: ["google", "gmail"],
  Amazon: ["amazon", "prime"],
  "Bank of America": ["bank of america", "bofa"],
  Chase: ["chase bank", "jpmorgan"],
  Binance: ["binance"],
  Coinbase: ["coinbase"],
  Meta: ["facebook", "instagram", "whatsapp"],
};

const LEGIT_BRAND_DOMAINS: Record<string, string[]> = {
  PayPal: ["paypal.com"],
  "State Bank of India (SBI)": ["sbi.co.in", "onlinesbi.sbi"],
  Netflix: ["netflix.com"],
  Apple: ["apple.com", "icloud.com"],
  Microsoft: ["microsoft.com", "office.com"],
  Google: ["google.com"],
  Amazon: ["amazon.com", "amazon.in"],
  "Bank of America": ["bankofamerica.com"],
  Chase: ["chase.com"],
  Binance: ["binance.com"],
  Coinbase: ["coinbase.com"],
  Meta: ["facebookmail.com", "meta.com"],
};

const SOCIAL_ENGINEERING_TRIGGERS = [
  { pattern: /account\s+(suspended|blocked|locked|terminated|deactivated)/i, name: "Account Suspension / Block Threat" },
  { pattern: /verify\s+(your\s+)?(identity|account|kyc|credentials|password)/i, name: "Urgent Identity / KYC Verification Lure" },
  { pattern: /within\s+24\s+hours|immediate(ly)?\s+action|urgent(ly)?|time-sensitive/i, name: "Psychological Time-Pressure / Artificial Urgency" },
  { pattern: /unauthorized\s+(login|transaction|access|activity)|suspicious\s+activity/i, name: "Fabricated Security Breach Alarm" },
  { pattern: /wire\s+transfer|gift\s+card|crypto\s+payment|invoice\s+attached/i, name: "Financial Extortion / Fake Invoice Bait" },
  { pattern: /click\s+here\s+to\s+restore|update\s+billing/i, name: "Call-to-Action Link Trap" },
];

/**
 * Main email header & content forensic dissector
 */
export function dissectEmailHeaders(rawText: string): EmailForensicReport {
  // Normalize line endings
  const lines = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

  const headers: Record<string, string[]> = {};
  let currentHeader = "";
  let bodyStartIndex = lines.length;

  // 1. Parse standard unfolding headers
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (line === "") {
      bodyStartIndex = i + 1;
      break;
    }

    if (/^[A-Za-z0-9_-]+:/.test(line)) {
      const colonIdx = line.indexOf(":");
      currentHeader = line.substring(0, colonIdx).toLowerCase();
      const val = line.substring(colonIdx + 1).trim();
      const list = headers[currentHeader] || [];
      list.push(val);
      headers[currentHeader] = list;
    } else if (currentHeader && /^\s+/.test(line)) {
      // Unfold multiline header
      const list = headers[currentHeader];
      if (list && list.length > 0) {
        const lastIdx = list.length - 1;
        list[lastIdx] = (list[lastIdx] || "") + " " + line.trim();
      }
    }
  }

  const getFirst = (key: string): string => headers[key]?.[0] || "";
  const getAll = (key: string): string[] => headers[key] || [];

  const rawSubject = getFirst("subject") || "(No Subject)";
  const rawFrom = getFirst("from");
  const rawReturnPath = getFirst("return-path");
  const rawReplyTo = getFirst("reply-to");
  const rawDate = getFirst("date");
  const rawMessageId = getFirst("message-id");
  const rawAuthResults = getAll("authentication-results").join(" ");
  const rawReceivedSpf = getAll("received-spf").join(" ");
  const receivedHeaders = getAll("received");

  const bodyText = lines.slice(bodyStartIndex).join("\n");

  // 2. Parse Sender Details
  const sender = parseSenderDetails(rawFrom, rawReturnPath, rawReplyTo);

  // 3. Parse Cryptographic Authentication Seals (SPF, DKIM, DMARC)
  const securitySeals = parseSecuritySeals(rawAuthResults, rawReceivedSpf);

  // 4. Parse Relay Hops from Received headers
  const hops = parseRelayHops(receivedHeaders);

  // 5. Detect Psychological Urgency / Phishing Lures in Subject + Body
  const fullContent = `${rawSubject} \n ${bodyText}`;
  const urgencySignals: string[] = [];
  for (const trigger of SOCIAL_ENGINEERING_TRIGGERS) {
    if (trigger.pattern.test(fullContent)) {
      urgencySignals.push(trigger.name);
    }
  }

  // 6. Extract and audit links in body
  const extractedLinks = extractAndAuditLinks(bodyText);

  // 7. Calculate Forensic Risk Score & Evidence
  const evidence: EmailForensicReport["forensicEvidence"] = [];
  let riskScore = 5; // Clean baseline

  // Sender Spoofing Evidence
  if (sender.isDisplayNameSpoofed && sender.spoofedBrand) {
    riskScore += 55;
    evidence.push({
      category: "SENDER_SPOOFING",
      status: "CRITICAL",
      detail: `Display Name impersonation detected: Sender presents as '${sender.spoofedBrand}', but actual email domain is '${sender.fromDomain || "unknown"}'.`,
    });
  }

  if (sender.isDomainMismatch) {
    riskScore += 25;
    evidence.push({
      category: "SENDER_SPOOFING",
      status: "WARNING",
      detail: `Return-Path envelope domain (${sender.returnPathDomain}) does not match From address domain (${sender.fromDomain}).`,
    });
  }

  // Security Seals Evidence
  if (securitySeals.spf === "FAIL") {
    riskScore += 30;
    evidence.push({
      category: "SECURITY_SEALS",
      status: "CRITICAL",
      detail: `SPF (Sender Policy Framework) FAILED: Sending server IP is not authorized by ${sender.fromDomain || "domain"} records.`,
    });
  } else if (securitySeals.spf === "PASS") {
    evidence.push({
      category: "SECURITY_SEALS",
      status: "VERIFIED",
      detail: `SPF Verified: Sending IP is cryptographically authorized by ${sender.fromDomain || "domain"}.`,
    });
  }

  if (securitySeals.dkim === "FAIL") {
    riskScore += 30;
    evidence.push({
      category: "SECURITY_SEALS",
      status: "CRITICAL",
      detail: "DKIM Signature FAILED: Cryptographic digital signature is forged or message body was tampered with in transit.",
    });
  } else if (securitySeals.dkim === "PASS") {
    evidence.push({
      category: "SECURITY_SEALS",
      status: "VERIFIED",
      detail: `DKIM Signature Verified: Cryptographically signed by authority domain '${securitySeals.dkimDomain || "sender"}'.`,
    });
  }

  if (securitySeals.dmarc === "FAIL") {
    riskScore += 35;
    evidence.push({
      category: "SECURITY_SEALS",
      status: "CRITICAL",
      detail: "DMARC Alignment FAILED: Email fails domain authentication policy requirements.",
    });
  } else if (securitySeals.dmarc === "PASS") {
    evidence.push({
      category: "SECURITY_SEALS",
      status: "VERIFIED",
      detail: "DMARC Policy Passed: Domain alignment confirmed.",
    });
  }

  // Urgency Tactics Evidence
  if (urgencySignals.length > 0) {
    riskScore += urgencySignals.length * 10;
    evidence.push({
      category: "SOCIAL_ENGINEERING",
      status: urgencySignals.length >= 2 ? "CRITICAL" : "WARNING",
      detail: `Social engineering pressure detected: ${urgencySignals.join(", ")}.`,
    });
  }

  // Suspicious Links
  const suspiciousLinks = extractedLinks.filter((l) => l.isSuspicious);
  if (suspiciousLinks.length > 0) {
    riskScore += suspiciousLinks.length * 15;
    evidence.push({
      category: "EMBEDDED_LINKS",
      status: "CRITICAL",
      detail: `Found ${suspiciousLinks.length} deceptive or high-risk links in email body targeting untrusted destinations.`,
    });
  }

  if (hops.length > 0) {
    evidence.push({
      category: "RELAY_TRAIL",
      status: "INFO",
      detail: `Dissected ${hops.length} mail transfer hops. Originating relay: ${hops[hops.length - 1]?.ipAddress || hops[0]?.fromServer || "Direct Delivery"}.`,
    });
  }

  // Cap riskScore
  riskScore = Math.min(100, Math.max(0, riskScore));

  // Determine Verdict
  let verdict: EmailForensicReport["verdict"] = "AUTHENTIC_LEGITIMATE";
  let summaryExplanation = "";

  if (riskScore >= 65 || sender.isDisplayNameSpoofed || securitySeals.dmarc === "FAIL") {
    verdict = "CRITICAL_PHISHING";
    summaryExplanation = `Critical Phishing Scam Detected (Risk: ${riskScore}/100). Sender identity deceptive spoofing and cryptographic authentication seal failures conclusively identify this message as a fraudulent attack.`;
  } else if (riskScore >= 35) {
    verdict = "SUSPICIOUS";
    summaryExplanation = `Suspicious Email Detected (Risk: ${riskScore}/100). Message exhibits social engineering urgency pressure or partial domain alignment anomalies. Exercise caution before opening links.`;
  } else {
    verdict = "AUTHENTIC_LEGITIMATE";
    summaryExplanation = `Authentic Email Verified (Risk: ${riskScore}/100). Cryptographic SPF/DKIM seals passed, sender domains match envelope credentials, and no deceptive brand spoofing was detected.`;
  }

  return {
    subject: rawSubject,
    dateSent: rawDate,
    messageId: rawMessageId,
    verdict,
    riskScore,
    sender,
    securitySeals,
    hops,
    urgencySignals,
    extractedLinks,
    summaryExplanation,
    forensicEvidence: evidence,
  };
}

// ─────────────────────────────────────────────────────────────
// Sub-Parsers
// ─────────────────────────────────────────────────────────────
function parseSenderDetails(rawFrom: string, rawReturnPath: string, rawReplyTo: string): SenderAnalysis {
  let displayName = "";
  let fromEmail = "";

  // Parse: "Brand Name" <user@domain.com> or user@domain.com
  const fromMatch = rawFrom.match(/^(?:"?([^"<]+)"?\s*)?(?:<?([^>]+)>?)$/);
  if (fromMatch) {
    displayName = (fromMatch[1] || "").trim();
    fromEmail = (fromMatch[2] || "").trim();
  } else {
    fromEmail = rawFrom.trim();
  }

  const cleanReturnPath = rawReturnPath.replace(/[<>]/g, "").trim();
  const cleanReplyTo = rawReplyTo.replace(/[<>]/g, "").trim();

  const getDomain = (addr: string) => {
    const at = addr.lastIndexOf("@");
    return at !== -1 ? addr.substring(at + 1).toLowerCase() : "";
  };

  const fromDomain = getDomain(fromEmail);
  const returnPathDomain = getDomain(cleanReturnPath);
  const replyToDomain = getDomain(cleanReplyTo);

  // Check Display Name Brand Spoofing
  let isDisplayNameSpoofed = false;
  let spoofedBrand: string | undefined;

  const lowerDisplay = displayName.toLowerCase();
  for (const [brand, triggers] of Object.entries(BRAND_KEYWORDS)) {
    const hit = triggers.some((t) => lowerDisplay.includes(t));
    if (hit) {
      // Check if actual fromDomain belongs to the legitimate brand
      const legitDomains = LEGIT_BRAND_DOMAINS[brand] || [];
      const isLegitDomain = legitDomains.some((ld) => fromDomain === ld || fromDomain.endsWith(`.${ld}`));
      if (!isLegitDomain && fromDomain) {
        isDisplayNameSpoofed = true;
        spoofedBrand = brand;
        break;
      }
    }
  }

  const isDomainMismatch =
    !!returnPathDomain && !!fromDomain && returnPathDomain !== fromDomain;

  return {
    displayName: displayName || undefined,
    fromEmail: fromEmail || undefined,
    fromDomain: fromDomain || undefined,
    returnPath: cleanReturnPath || undefined,
    returnPathDomain: returnPathDomain || undefined,
    replyTo: cleanReplyTo || undefined,
    replyToDomain: replyToDomain || undefined,
    isDisplayNameSpoofed,
    spoofedBrand,
    isDomainMismatch,
  };
}

function parseSecuritySeals(authResults: string, receivedSpf: string): SecuritySeals {
  const combined = `${authResults} ${receivedSpf}`.toLowerCase();

  // SPF
  let spf: SecuritySeals["spf"] = "NONE";
  if (combined.includes("spf=pass") || combined.includes("pass (google.com") || combined.includes("spf: pass")) {
    spf = "PASS";
  } else if (combined.includes("spf=fail") || combined.includes("spf: fail")) {
    spf = "FAIL";
  } else if (combined.includes("spf=softfail")) {
    spf = "SOFTFAIL";
  } else if (combined.includes("spf=neutral")) {
    spf = "NEUTRAL";
  }

  // DKIM
  let dkim: SecuritySeals["dkim"] = "NONE";
  let dkimDomain: string | undefined;
  if (combined.includes("dkim=pass")) {
    dkim = "PASS";
    const dMatch = combined.match(/header\.d=([a-z0-9.-]+)/);
    if (dMatch) dkimDomain = dMatch[1];
  } else if (combined.includes("dkim=fail")) {
    dkim = "FAIL";
  }

  // DMARC
  let dmarc: SecuritySeals["dmarc"] = "NONE";
  let dmarcPolicy: string | undefined;
  if (combined.includes("dmarc=pass")) {
    dmarc = "PASS";
  } else if (combined.includes("dmarc=fail")) {
    dmarc = "FAIL";
    const pMatch = combined.match(/action=([a-z]+)/);
    if (pMatch) dmarcPolicy = pMatch[1];
  }

  return {
    spf,
    dkim,
    dkimDomain,
    dmarc,
    dmarcPolicy,
  };
}

function parseRelayHops(receivedList: string[]): EmailHop[] {
  const hops: EmailHop[] = [];

  for (let i = 0; i < receivedList.length; i++) {
    const raw = receivedList[i]!;
    // Match: from <server> by <server> with ...; <date>
    const fromMatch = raw.match(/from\s+([^\s;()]+)(?:\s+\((?:[^)]*?\[)?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\]?\))?/i);
    const byMatch = raw.match(/by\s+([^\s;]+)/i);

    let ipAddress = fromMatch?.[2];
    if (!ipAddress) {
      const genericIp = raw.match(/\[(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\]/);
      if (genericIp) ipAddress = genericIp[1];
    }

    const dateMatch = raw.match(/;\s*(.+)$/);

    hops.push({
      hopIndex: i + 1,
      fromServer: fromMatch?.[1],
      byServer: byMatch?.[1],
      ipAddress,
      timestamp: dateMatch ? dateMatch[1]?.trim() : undefined,
    });
  }

  return hops;
}

function extractAndAuditLinks(body: string) {
  const urlRegex = /https?:\/\/[^\s<>"']+/gi;
  const matches = body.match(urlRegex) || [];
  const links: EmailForensicReport["extractedLinks"] = [];
  const seen = new Set<string>();

  for (const m of matches) {
    if (seen.has(m)) continue;
    seen.add(m);

    try {
      const parsed = new URL(m);
      const host = parsed.hostname.toLowerCase();
      const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(host);
      const isBadTld = /\.(xyz|top|buzz|click|rest|fit|tk|ml)$/i.test(host);

      links.push({
        url: m,
        domain: host,
        isSuspicious: isIp || isBadTld,
      });
    } catch {
      // ignore malformed URLs
    }
  }

  return links;
}
