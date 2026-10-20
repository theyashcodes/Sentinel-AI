import { QRScanSecurityCheckResult, QRScanWarning } from "../types/qr-scanner";
import { URLSecurityAnalyzer, ParsedUrlDetails } from "./url-security";
import { QRRiskEngine, RiskEvaluationResult } from "./risk-engine";

export interface FullQREvaluation {
  parsed: ParsedUrlDetails;
  riskResult: RiskEvaluationResult;
  securityChecks: QRScanSecurityCheckResult;
}

export class QRSecurityChecker {
  /**
   * Backward-compatible analyzeUrl method returning QRScanSecurityCheckResult
   */
  static analyzeUrl(urlStr: string): QRScanSecurityCheckResult {
    const full = this.evaluateSecurity(urlStr);
    return full.securityChecks;
  }

  /**
   * Complete multi-vector security evaluation for QR Code URL payloads
   */
  static evaluateSecurity(urlStr: string): FullQREvaluation {
    try {
      const parsed = URLSecurityAnalyzer.analyze(urlStr);
      const riskResult = QRRiskEngine.evaluate(parsed);

      const securityChecks: QRScanSecurityCheckResult = {
        isShortener: parsed.isShortener,
        isPunycode: parsed.homoglyphAudit.isPunycode,
        isUnicodeSpoof: parsed.homoglyphAudit.hasHomoglyphSpoof,
        isHttp: parsed.protocol === "http",
        isSuspiciousTld: parsed.isHighAbuseTld,
        isSsrfTarget: parsed.ssrfTarget,
        hasNestedRedirect: parsed.redirectAudit.hasNestedRedirect,
        hasUserInfo: parsed.hasUserInfo,
        hasBrandMismatch: parsed.brandAudit.isImpersonating,
        // Specific Separated Redirection Signals (Req 1 & 4)
        redirect_parameter_present: parsed.redirectAudit.redirect_parameter_present,
        redirect_destination_untrusted: parsed.redirectAudit.redirect_destination_untrusted,
        redirect_chain_observed: parsed.redirectAudit.redirect_chain_observed,
        redirect_chain_verified: parsed.redirectAudit.redirect_chain_verified,
        networkRedirectStatus: parsed.redirectAudit.networkRedirectStatus,
        warnings: riskResult.warnings,
      };

      return {
        parsed,
        riskResult,
        securityChecks,
      };
    } catch {
      // Fallback for invalid or non-standard URLs
      const fallbackWarning: QRScanWarning = {
        code: "INVALID_URL",
        title: "Invalid URL Format",
        description: `The extracted QR payload is not a valid structured web URL: "${urlStr}"`,
        severity: "high",
      };

      const dummyParsed: ParsedUrlDetails = {
        rawUrl: urlStr,
        normalizedUrl: urlStr,
        protocol: "unknown",
        hostname: "",
        port: "",
        pathname: "",
        search: "",
        hash: "",
        hasUserInfo: false,
        domainInfo: {
          rawHostname: "",
          normalizedHostname: "",
          registrableDomain: "",
          subdomain: "",
          tld: "",
          isIpAddress: false,
          ipVersion: null,
          isPrivateOrLoopback: false,
        },
        brandAudit: { isImpersonating: false, registrableDomain: "", legitimateDomains: [] },
        homoglyphAudit: { isPunycode: false, hasNonAscii: false, hasMixedScripts: false, hasHomoglyphSpoof: false, confusableCharsFound: [] },
        redirectAudit: {
          hasNestedRedirect: false,
          redirect_parameter_present: false,
          redirect_destination_untrusted: false,
          redirect_chain_observed: false,
          redirect_chain_verified: false,
          networkRedirectStatus: "NOT_TESTED",
          hopDepth: 0,
          isExternalDestination: false,
          isSameOrigin: false,
          isSameRegistrableDomain: false,
          isReservedSyntheticDomain: false,
        },
        ssrfTarget: false,
        isShortener: false,
        isHighAbuseTld: false,
      };

      const fallbackRisk: RiskEvaluationResult = {
        riskScore: 50,
        authenticityScore: 50,
        threatLevel: "SUSPICIOUS",
        confidence: 40,
        confidenceType: "HEURISTIC_ESTIMATE",
        confidenceLabel: "Heuristic Confidence Estimate",
        threatType: "INVALID_URL",
        reasoning: "The scanned QR code contains plain text or an invalid URL structure.",
        indicators: ["Unparseable or non-standard URL structure"],
        scoreBreakdown: {
          brandImpersonationScore: 0,
          unicodeConfusableScore: 0,
          redirectRiskScore: 0,
          urlStructureScore: 15,
          domainReputationScore: 0,
          contextualLureScore: 0,
          totalRiskScore: 50,
        },
        signalEvidence: [],
        warnings: [fallbackWarning],
      };

      return {
        parsed: dummyParsed,
        riskResult: fallbackRisk,
        securityChecks: {
          isShortener: false,
          isPunycode: false,
          isUnicodeSpoof: false,
          isHttp: false,
          isSuspiciousTld: false,
          redirect_parameter_present: false,
          redirect_destination_untrusted: false,
          redirect_chain_observed: false,
          redirect_chain_verified: false,
          networkRedirectStatus: "NOT_TESTED",
          warnings: [fallbackWarning],
        },
      };
    }
  }
}
