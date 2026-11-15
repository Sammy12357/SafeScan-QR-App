export type VerificationStatus = "complete" | "incomplete" | "unverified" | "not_applicable";

export type ScanEvidence = {
  verdict: "safe" | "warn" | "danger";
  overallRisk?: "safe" | "suspicious" | "high";
  verificationStatus?: VerificationStatus;
  source?: "backend" | "demo-fallback";
  historical?: boolean;
  riskScore?: number;
  analyzedAt?: string;
  payloadType?: string;
  unverifiedChecks?: string[];
  signals?: Array<{ severity: "low" | "medium" | "high"; passed?: boolean; verified?: boolean }>;
};

export function normalizeSavedVerdict(raw: string | undefined, riskScore: number): ScanEvidence["verdict"] {
  const verdict = (raw ?? "").trim().toLowerCase();
  if (["malicious", "high", "danger", "dangerous"].includes(verdict) || riskScore >= 75) return "danger";
  if (["caution", "suspicious", "medium", "warn"].includes(verdict) || riskScore >= 35) return "warn";
  return "safe";
}

export function getScanVerdictDisplay(result: ScanEvidence) {
  if (result.source === "demo-fallback") {
    const highRisk = result.verdict === "danger" || result.overallRisk === "high" || (result.riskScore ?? 0) >= 75;
    return {
      label: highRisk ? "Demo high-risk indicators" : "Demo result only",
      summary: highRisk
        ? "Local demo rules found high-risk patterns, but live checks did not complete. Do not open this destination."
        : "This local demonstration did not complete SafeScan's live checks. Do not rely on it to open a destination.",
      tone: highRisk ? "danger" as const : "warn" as const
    };
  }

  if (result.verdict === "danger" || result.overallRisk === "high" || (result.riskScore ?? 0) >= 75 || result.signals?.some((signal) => signal.severity === "high" && signal.passed === false)) {
    return {
      label: "High-risk indicators",
      summary: "High-risk signals were found. Review the reasons and do not open this destination.",
      tone: "danger" as const
    };
  }

  if (result.historical && result.verdict === "safe") {
    return {
      label: "Lower risk score at scan time",
      summary: "This saved scan does not preserve check coverage. The destination may have changed; scan it again before opening.",
      tone: "warn" as const
    };
  }

  if (result.source !== "backend" || !result.verificationStatus || result.verificationStatus === "incomplete" || result.verificationStatus === "unverified" || (result.unverifiedChecks?.length ?? 0) > 0 || result.signals?.some((signal) => signal.verified === false)) {
    return {
      label: "Could not fully check",
      summary: "SafeScan could not confirm that the required checks completed. Confirm the source independently.",
      tone: "warn" as const
    };
  }

  if (result.verdict === "warn" || result.overallRisk === "suspicious" || (result.riskScore ?? 0) >= 35) {
    return {
      label: "Needs review",
      summary: "Some findings need review. Confirm the source independently before taking action.",
      tone: "warn" as const
    };
  }

  if (result.verificationStatus === "not_applicable") {
    return {
      label: "Content decoded",
      summary: "This content was decoded; no website destination check applies.",
      tone: "warn" as const
    };
  }

  return {
    label: "No threats found in checks",
    summary: "Completed configured checks found no known threat match at scan time. A destination can change later.",
    tone: "safe" as const
  };
}

export function canOpenScannedUrl(result: ScanEvidence & { url: string }, now = Date.now()) {
  if (result.historical || result.source !== "backend" || result.verificationStatus !== "complete") return false;
  if (result.verdict !== "safe" || result.overallRisk !== "safe") return false;
  if ((result.unverifiedChecks?.length ?? 0) > 0 || result.signals?.some((signal) => signal.verified === false || (signal.severity === "high" && signal.passed === false))) return false;
  if ((result.riskScore ?? 100) >= 35 || (result.payloadType && result.payloadType.toLowerCase() !== "url")) return false;
  const analyzedAt = Date.parse(result.analyzedAt ?? "");
  if (!Number.isFinite(analyzedAt) || analyzedAt > now || now - analyzedAt > 5 * 60 * 1000) return false;
  if (!result.url || result.url !== result.url.trim() || /\s/.test(result.url)) return false;
  try {
    const parsed = new URL(result.url);
    return parsed.protocol === "https:" && Boolean(parsed.hostname) && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}
