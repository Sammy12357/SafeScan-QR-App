import assert from "node:assert/strict";
import test from "node:test";
import { canOpenScannedUrl, getScanVerdictDisplay, normalizeSavedVerdict } from "../utils/verdictCopy.ts";
import { enhanceAnalyzeResult } from "../utils/localRisk.ts";

const now = Date.parse("2026-11-15T12:00:00Z");
const currentUrl = {
  url: "https://example.com/path",
  verdict: "safe",
  overallRisk: "safe",
  source: "backend",
  verificationStatus: "complete",
  riskScore: 8,
  analyzedAt: "2026-11-15T11:59:00Z",
  signals: []
};

test("only a current fully checked low-risk web result can open", () => {
  assert.equal(getScanVerdictDisplay(currentUrl).label, "No threats found in checks");
  assert.equal(canOpenScannedUrl(currentUrl, now), true);
  for (const change of [
    { verificationStatus: undefined },
    { verificationStatus: "incomplete" },
    { verificationStatus: "unverified" },
    { verificationStatus: "not_applicable" },
    { verdict: "warn" },
    { overallRisk: "high" },
    { source: "demo-fallback" },
    { historical: true },
    { unverifiedChecks: ["Web Risk"] },
    { signals: [{ severity: "low", verified: false }] },
    { signals: [{ severity: "high", passed: false }] },
    { riskScore: 40 },
    { payloadType: "SMS" },
    { analyzedAt: "2026-11-15T11:54:59Z" },
    { analyzedAt: "2026-11-15T12:00:01Z" },
    { url: "http://example.com/" },
    { url: "https://trusted.com@attacker.example/" },
    { url: "javascript:alert(1)" },
    { url: "Text with https://example.com" }
  ]) {
    assert.equal(canOpenScannedUrl({ ...currentUrl, ...change }, now), false, JSON.stringify(change));
  }
});

test("incomplete and saved results cannot make a current safety claim", () => {
  assert.equal(getScanVerdictDisplay({ ...currentUrl, verificationStatus: undefined }).label, "Could not fully check");
  assert.equal(getScanVerdictDisplay({ ...currentUrl, source: undefined }).label, "Could not fully check");
  assert.equal(getScanVerdictDisplay({ ...currentUrl, verificationStatus: "incomplete" }).tone, "warn");
  assert.equal(getScanVerdictDisplay({ ...currentUrl, unverifiedChecks: ["Web Risk"] }).label, "Could not fully check");
  assert.equal(getScanVerdictDisplay({ ...currentUrl, historical: true }).label, "Lower risk score at scan time");
  assert.equal(getScanVerdictDisplay({ ...currentUrl, verificationStatus: "not_applicable" }).label, "Content decoded");
  assert.equal(getScanVerdictDisplay({ ...currentUrl, verificationStatus: "not_applicable", verdict: "warn" }).label, "Needs review");
});

test("high-risk findings and demo results remain conspicuous", () => {
  assert.equal(getScanVerdictDisplay({ ...currentUrl, verdict: "danger", verificationStatus: undefined }).label, "High-risk indicators");
  assert.equal(getScanVerdictDisplay({ ...currentUrl, source: "demo-fallback" }).label, "Demo result only");
  assert.equal(getScanVerdictDisplay({ ...currentUrl, source: "demo-fallback", verdict: "danger" }).label, "Demo high-risk indicators");
});

test("saved risk scores never downgrade an explicit dangerous verdict", () => {
  assert.equal(normalizeSavedVerdict("MALICIOUS", 3), "danger");
  assert.equal(normalizeSavedVerdict("SAFE", 93), "danger");
  assert.equal(normalizeSavedVerdict("CAUTION", 6), "warn");
  assert.equal(normalizeSavedVerdict("SAFE", 9), "safe");
});

test("local scoring preserves a high-risk backend verdict on a familiar domain", () => {
  const result = enhanceAnalyzeResult({
    ...currentUrl,
    url: "https://google.com/",
    verdict: "danger",
    overallRisk: "high",
    riskScore: 95,
    confidenceScore: 95,
    signals: [],
    verdictText: "High-risk backend finding"
  });
  assert.equal(result.verdict, "danger");
  assert.equal(result.overallRisk, "high");
  assert.ok(result.riskScore >= 95);
  assert.equal(result.threatType, undefined);
  assert.equal(canOpenScannedUrl(result, now), false);
});

test("local scoring preserves backend caution on a familiar domain", () => {
  const result = enhanceAnalyzeResult({
    ...currentUrl,
    url: "https://google.com/",
    verdict: "warn",
    overallRisk: "suspicious",
    riskScore: 62,
    confidenceScore: 62,
    signals: [],
    verdictText: "Review the destination"
  });
  assert.equal(result.verdict, "warn");
  assert.equal(result.overallRisk, "suspicious");
  assert.ok(result.riskScore >= 62);
  assert.equal(getScanVerdictDisplay(result).label, "Needs review");
  assert.equal(canOpenScannedUrl(result, now), false);
});
