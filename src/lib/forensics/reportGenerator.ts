export type ReportLanguage = "en" | "hi";

export interface ForensicReportData {
  caseId: string;
  timestamp: string;
  examiner: string;
  type: "VOICE" | "URL" | "QR" | "MEDIA" | "EMAIL" | "TRACER" | "FILE";
  target: string;
  riskLevel: "SAFE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  confidenceScore: number;
  threatCategory: string;
  summary: string;
  findings: string[];
  technicalEvidence: Record<string, any>;
  sha256Hash: string;
}

export interface LocalizedReportContent {
  title: string;
  subtitle: string;
  classification: string;
  legalHeader: string;
  caseRefLabel: string;
  dateLabel: string;
  examinerLabel: string;
  targetLabel: string;
  typeLabel: string;
  verdictLabel: string;
  riskBadge: string;
  confidenceLabel: string;
  summaryTitle: string;
  evidenceTitle: string;
  techDetailsTitle: string;
  cryptographicTitle: string;
  hashLabel: string;
  remediationTitle: string;
  remediationSteps: string[];
  disclaimer: string;
  verifiedSeal: string;
}

export function generateLocalizedContent(
  data: ForensicReportData,
  lang: ReportLanguage
): LocalizedReportContent {
  const isEn = lang === "en";
  const isCritical = data.riskLevel === "CRITICAL" || data.riskLevel === "HIGH";

  if (isEn) {
    return {
      title: "SENTINEL AI CYBER FORENSICS INTELLIGENCE",
      subtitle: "EXECUTIVE FORENSIC INCIDENT DOSSIER & EVIDENCE AUDIT",
      classification: "CONFIDENTIAL // LAW ENFORCEMENT & REGULATORY COMPLIANCE READY",
      legalHeader: "OFFICIAL DIGITAL EVIDENCE AUDIT LOG",
      caseRefLabel: "Case Dossier ID",
      dateLabel: "Timestamp (UTC+5:30)",
      examinerLabel: "Forensic Engine",
      targetLabel: "Target Under Inspection",
      typeLabel: "Inspection Vector",
      verdictLabel: "Primary Diagnostic Verdict",
      riskBadge: isCritical ? "CRITICAL THREAT CONFIRMED" : "AUTHENTIC / LOW RISK",
      confidenceLabel: "Machine Learning Confidence",
      summaryTitle: "1. Executive Forensic Summary",
      evidenceTitle: "2. Key Forensic Findings & Telemetry",
      techDetailsTitle: "3. Bio-Acoustic & Structural Evidence Telemetry",
      cryptographicTitle: "4. Cryptographic Proof of Evidence Integrity",
      hashLabel: "SHA-256 Digest Hash",
      remediationTitle: "5. Recommended Incident Response & Legal Actions",
      remediationSteps: isCritical
        ? [
            "File an immediate Cyber Crime grievance on the National Cyber Crime Portal (cybercrime.gov.in) with this Case Dossier ID.",
            "If monetary fraud or banking impersonation is detected, request an immediate transaction freeze from the concerned bank.",
            "Block, isolate, and blacklist the origin number, domain, or sender address across all organizational gateways.",
            "Preserve raw binary artifacts in an encrypted vault for criminal prosecution under Section 66D of the Information Technology Act.",
          ]
        : [
            "No hostile cyber extortion or generative deepfake patterns were identified within the sample boundaries.",
            "Target passed acoustic frequency and signature integrity benchmarks.",
            "Continue standard hygiene practices and retain audit logs for routine compliance.",
          ],
      disclaimer:
        "This document was autonomously compiled by Sentinel AI Deep Security Intelligence Engine. Telemetry and acoustic metrics have been cryptographically sealed to ensure non-repudiation.",
      verifiedSeal: "SENTINEL AI VERIFIED FORENSIC SEAL",
    };
  }

  // Hindi Localization (हिंदी)
  return {
    title: "सेंटिनल एआई साइबर फॉरेंसिक अनुसंधान केंद्र",
    subtitle: "गोपनीय साइबर अपराध जांच एवं फॉरेंसिक साक्ष्य रिपोर्ट",
    classification: "अति गोपनीय // कानूनी साक्ष्य एवं साइबर सेल शिकायत हेतु प्रमाणित",
    legalHeader: "आधिकारिक डिजिटल साक्ष्य जांच रिपोर्ट",
    caseRefLabel: "मामला संदर्भ सं. (Case Ref)",
    dateLabel: "जांच का समय (Timestamp)",
    examinerLabel: "फॉरेंसिक जांच प्रणाली",
    targetLabel: "जांच की गई सामग्री / स्रोत",
    typeLabel: "जांच की श्रेणी",
    verdictLabel: "अंतिम फॉरेंसिक निर्णय",
    riskBadge: isCritical ? "⚠️ गंभीर साइबर खतरा पुष्टीकृत" : "✅ सुरक्षित / प्रामाणिक",
    confidenceLabel: "मशीन लर्निंग सटीकता स्कोर",
    summaryTitle: "१. कार्यकारी फॉरेंसिक सारांश",
    evidenceTitle: "२. मुख्य तकनीकी निष्कर्ष एवं साक्ष्य",
    techDetailsTitle: "३. बायो-अकॉस्टिक एवं संरचनात्मक डेटा मैट्रिक्स",
    cryptographicTitle: "४. डिजिटल साक्ष्य की अखंडता एवं क्रिप्टोग्राफिक प्रमाण",
    hashLabel: "एसएचए-२५६ (SHA-256) डिजिटल फिंगरप्रिंट",
    remediationTitle: "५. अनुशंसित कानूनी व आपातकालीन बचाव कदम",
    remediationSteps: isCritical
      ? [
          "इस केस संदर्भ संख्या (Case Ref) के साथ राष्ट्रीय साइबर अपराध रिपोर्टिंग पोर्टल (cybercrime.gov.in) पर तुरंत शिकायत दर्ज करें।",
          "यदि बैंकिंग धोखाधड़ी या जबरन वसूली (Digital Arrest) का मामला है, तो तुरंत अपने बैंक को सूचित कर लेन-देन फ्रीज करवाएं।",
          "संबंधित फोन नंबर, ईमेल या डोमेन को सभी संचार माध्यमों पर ब्लॉक व ब्लैकलिस्ट करें।",
          "भारतीय सूचना प्रौद्योगिकी अधिनियम (IT Act 2000) की धारा 66D के तहत कानूनी कार्रवाई हेतु इस डिजिटल रिपोर्ट को साक्ष्य के रूप में संलग्न करें।",
        ]
      : [
          "दिए गए नमूने में कोई दुर्भावनापूर्ण या डीपफेक वॉइस क्लोन पैटर्न नहीं पाया गया।",
          "नमूना सामान्य अकॉस्टिक एवं सुरक्षा मानकों पर खरा उतरा है।",
          "सुरक्षा मानकों का पालन जारी रखें और रिकॉर्ड को सुरक्षित रखें।",
        ],
    disclaimer:
      "यह दस्तावेज सेंटिनल एआई साइबर सुरक्षा कोर द्वारा स्वचालित रूप से तैयार किया गया है। डिजिटल साक्ष्य की प्रामाणिकता सुनिश्चित करने के लिए सभी तकनीकी मापदंडों को डिजिटल रूप से सील किया गया है।",
    verifiedSeal: "सेंटिनल एआई प्रमाणित सुरक्षा मोहर",
  };
}
