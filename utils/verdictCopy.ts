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

export function classifyWebVerdict(label: string): Pick<ScanEvidence, "verdict" | "verificationStatus"> | null {
  const normalized = label.trim().toLowerCase();
  if (normalized === "high-risk indicators") return { verdict: "danger" };
  if (normalized === "no threats found in checks") return { verdict: "safe", verificationStatus: "complete" };
  if (normalized === "content decoded") return { verdict: "safe", verificationStatus: "not_applicable" };
  if (normalized === "needs review") return { verdict: "warn", verificationStatus: "complete" };
  if (normalized === "could not fully check") return { verdict: "warn", verificationStatus: "incomplete" };
  return null;
}

function decodeHtmlEntities(value: string) {
  const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  return value.replace(/&(?:amp|lt|gt|quot|apos|nbsp|#\d+|#x[0-9a-f]+);/gi, (entity) => {
    const key = entity.slice(1, -1).toLowerCase();
    if (key in named) return named[key];
    const codePoint = key.startsWith("#x") ? Number.parseInt(key.slice(2), 16) : Number.parseInt(key.slice(1), 10);
    return Number.isInteger(codePoint) && codePoint > 0 && codePoint <= 0x10ffff
      ? String.fromCodePoint(codePoint)
      : entity;
  });
}

function visibleText(html: string, pattern: RegExp) {
  const match = pattern.exec(html);
  return match?.[1] ? decodeHtmlEntities(match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()) : "";
}

/** Read only the current SafeScan website result shape; absent fields fail closed. */
export function extractWebsiteScanFields(html: string) {
  const payloadMatch = /<p class="engine-label">Exact decoded QR payload<\/p>\s*<pre\b[^>]*class=["'][^"']*\bdecoded-payload\b[^"']*["'][^>]*>([\s\S]*?)<\/pre>/i.exec(html);
  const verdictLabel = visibleText(html, /<h2 id="riskVerdictTitle">([\s\S]*?)<\/h2>/i);
  if (!payloadMatch || !payloadMatch[1] || !classifyWebVerdict(verdictLabel)) return null;
  return {
    payload: decodeHtmlEntities(payloadMatch[1]),
    verdictLabel,
    verdictText: visibleText(html, /<p class="result-support">([\s\S]*?)<\/p>/i),
    threatText: visibleText(html, /<p class="threat-type-line">[\s\S]*?<strong>Finding:<\/strong>\s*([\s\S]*?)<\/p>/i),
    executionText: visibleText(html, /<p class="engine-label">What this QR requests<\/p>\s*<p>([\s\S]*?)<\/p>/i)
  };
}

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
