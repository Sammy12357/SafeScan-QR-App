import assert from "node:assert/strict";
import test from "node:test";
import { enhanceAnalyzeResult } from "../utils/localRisk";
import { getOpenPolicy } from "../utils/openPolicy";
import { AnalyzeResultSchema } from "../utils/schemas";

function backendScan(overrides: Record<string, unknown> = {}) {
  return {
    ...AnalyzeResultSchema.parse({
      url: "https://example.com/",
      overallRisk: "safe",
      confidenceScore: 8,
      analyzedAt: new Date().toISOString(),
      verificationStatus: "complete",
      unverifiedChecks: [],
      signals: [],
      ...overrides
    }),
    source: "backend" as const
  };
}

test("only a complete safe backend verdict opens a direct HTTPS URL normally", () => {
  const scan = enhanceAnalyzeResult(backendScan());
  assert.deepEqual(getOpenPolicy(scan), {
    kind: "safe",
    destination: "https://example.com/",
    reason: "Required checks completed with no known unsafe match."
  });
});

test("missing and failed checks require acknowledgment, even when the score is low", () => {
  const missingCoverage = backendScan({ verificationStatus: undefined, unverifiedChecks: undefined });
  const failedCoverage = backendScan({ verificationStatus: "complete", unverifiedChecks: ["VirusTotal Reputation"] });
  const signalFailed = backendScan({
    signals: [{ check: "Google Web Risk", result: "Unavailable", severity: "medium", passed: false, verified: false }]
  });

  for (const scan of [missingCoverage, failedCoverage, signalFailed]) {
    const enhanced = enhanceAnalyzeResult(scan);
    assert.equal(enhanced.verdict, "warn");
    assert.ok(enhanced.riskScore >= 40);
    assert.equal(getOpenPolicy(enhanced).kind, "caution");
  }
});

test("a malicious backend verdict on a popular domain cannot be downgraded locally", () => {
  const scan = backendScan({
    url: "https://google.com/",
    overallRisk: "high",
    confidenceScore: 95,
    signals: [{ check: "Google Web Risk", result: "Social engineering match", severity: "high", passed: false, verified: true }]
  });
  const enhanced = enhanceAnalyzeResult(scan);
  assert.equal(enhanced.verdict, "danger");
  assert.ok(enhanced.riskScore >= 95);
  assert.equal(getOpenPolicy(enhanced).kind, "blocked");
  const inconsistent = backendScan({
    overallRisk: "safe",
    confidenceScore: 8,
    signals: [{ check: "Reputation", result: "Known bad", severity: "high", passed: false }]
  });
  assert.equal(getOpenPolicy(inconsistent).kind, "blocked");
});

test("wallet actions, embedded URLs, misleading userinfo, and demo results cannot launch", () => {
  const cases = [
    backendScan({ url: "upi://pay?pa=attacker@example.com", payloadType: "UPI" }),
    backendScan({ url: "Pay by UPI at https://example.com/", payloadType: "UPI" }),
    backendScan({ url: "https://example.com/", payloadType: "SMS" }),
    backendScan({ url: "https://trusted.com@attacker.example/" }),
    { ...backendScan(), source: "demo-fallback" as const }
  ];
  for (const scan of cases) assert.equal(getOpenPolicy(scan).kind, "blocked");
});

test("history results without current verification never receive the normal open path", () => {
  const oldResult = { ...backendScan(), verificationStatus: undefined, unverifiedChecks: undefined };
  assert.equal(getOpenPolicy(oldResult).kind, "caution");
  const expired = backendScan({ analyzedAt: "2020-01-01T00:00:00Z" });
  assert.equal(getOpenPolicy(expired).kind, "caution");
  const boundary = backendScan({ analyzedAt: "2026-10-30T12:00:00Z" });
  const scannedAt = Date.parse(boundary.analyzedAt);
  assert.equal(getOpenPolicy(boundary, scannedAt + 5 * 60 * 1000).kind, "safe");
  assert.equal(getOpenPolicy(boundary, scannedAt + 5 * 60 * 1000 + 1).kind, "caution");
});

test("schema preserves backend coverage and raw payload metadata", () => {
  const scan = backendScan({
    rawPayload: "HTTPS://example.com/",
    verificationStatus: "incomplete",
    unverifiedChecks: ["VirusTotal Reputation"],
    signals: [{ check: "VirusTotal Reputation", result: "Not configured", severity: "low", passed: true, verified: false }]
  });
  assert.equal(scan.rawPayload, "HTTPS://example.com/");
  assert.equal(scan.verificationStatus, "incomplete");
  assert.deepEqual(scan.unverifiedChecks, ["VirusTotal Reputation"]);
  assert.equal(scan.signals[0].verified, false);
});
