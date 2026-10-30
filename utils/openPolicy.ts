import type { AnalyzeResult } from "./schemas";

type ScanForOpening = Pick<
  AnalyzeResult,
  "url" | "riskScore" | "verdict" | "overallRisk" | "verificationStatus" | "unverifiedChecks" | "payloadType" | "source" | "signals" | "analyzedAt"
>;

export type OpenPolicy =
  | { kind: "blocked"; destination: null; reason: string }
  | { kind: "caution"; destination: string; reason: string }
  | { kind: "safe"; destination: string; reason: string };

/** Only a direct web URL can be launched from a QR verdict. Embedded URLs and app actions stay inert. */
export function getOpenPolicy(scan: ScanForOpening, now = Date.now()): OpenPolicy {
  const payload = scan.url;
  if (!payload || payload !== payload.trim() || /\s/.test(payload)) {
    return { kind: "blocked", destination: null, reason: "This QR does not contain one direct web URL." };
  }

  let parsed: URL;
  try {
    parsed = new URL(payload);
  } catch {
    return { kind: "blocked", destination: null, reason: "This QR does not contain a launchable web URL." };
  }

  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    !parsed.hostname ||
    parsed.username ||
    parsed.password ||
    (scan.payloadType && scan.payloadType.toLowerCase() !== "url")
  ) {
    return { kind: "blocked", destination: null, reason: "Wallet, payment, message, and embedded URL actions must be opened in their own app after independent review." };
  }

  if (scan.source === "demo-fallback") {
    return { kind: "blocked", destination: null, reason: "A demo result cannot authorize opening a QR destination." };
  }

  if (
    scan.verdict === "danger" ||
    scan.overallRisk === "high" ||
    scan.riskScore >= 75 ||
    scan.signals.some((signal) => signal.severity === "high" && signal.passed === false)
  ) {
    return { kind: "blocked", destination: null, reason: "SafeScan found high-risk indicators. Opening this link is blocked." };
  }

  const complete =
    scan.source === "backend" &&
    scan.verificationStatus === "complete" &&
    (scan.unverifiedChecks?.length ?? 0) === 0 &&
    !scan.signals.some((signal) => signal.verified === false);
  const analyzedAt = Date.parse(scan.analyzedAt);
  const fresh = Number.isFinite(analyzedAt) && analyzedAt <= now && now - analyzedAt <= 5 * 60 * 1000;

  if (
    parsed.protocol === "https:" &&
    complete &&
    fresh &&
    scan.verdict === "safe" &&
    scan.overallRisk === "safe" &&
    scan.riskScore < 35
  ) {
    return { kind: "safe", destination: parsed.href, reason: "Required checks completed with no known unsafe match." };
  }

  return {
    kind: "caution",
    destination: parsed.href,
    reason: complete && fresh
      ? "SafeScan found caution signals. Confirm the destination independently before opening it."
      : "SafeScan could not complete every required check, or this result is older than five minutes. Confirm the destination independently before opening it."
  };
}
