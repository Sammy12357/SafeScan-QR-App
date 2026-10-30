import assert from "node:assert/strict";
import test from "node:test";
import { analyzeUrl, api, clearApiTokens, setApiTokens } from "../services/api";
import { getOpenPolicy } from "../utils/openPolicy";

test("backend outage rejects a scan instead of creating a mock safe verdict", async () => {
  clearApiTokens();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({ detail: "scanner unavailable" }), {
    status: 503,
    headers: { "Content-Type": "application/json" }
  })) as typeof fetch;

  try {
    await assert.rejects(analyzeUrl("https://example.com/"), /503/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("guest direct URL uses the public JSON analyzer and retains the exact QR payload", async () => {
  clearApiTokens();
  const originalFetch = globalThis.fetch;
  const rawPayload = "  https://example.com/  ";
  let calledUrl = "";
  let requestBody: unknown;
  globalThis.fetch = (async (input, init) => {
    calledUrl = String(input);
    requestBody = JSON.parse(String(init?.body));
    assert.equal(new Headers(init?.headers).has("Authorization"), false);
    return new Response(JSON.stringify({
    url: "https://example.com/",
    overallRisk: "safe",
    confidenceScore: 8,
    verdict: "No known unsafe match was found.",
    verificationStatus: "complete",
    unverifiedChecks: [],
    scannedAt: new Date().toISOString(),
    signals: []
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;

  try {
    const scan = await analyzeUrl(rawPayload);
    assert.match(calledUrl, /\/api\/analyze$/);
    assert.deepEqual(requestBody, { url: "https://example.com/" });
    assert.equal(scan.source, "backend");
    assert.equal(scan.rawPayload, rawPayload);
    assert.equal(scan.payloadType, "URL");
    assert.equal(scan.verificationStatus, "complete");
    assert.deepEqual(scan.unverifiedChecks, []);
    assert.equal(getOpenPolicy(scan).kind, "safe");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("guest payment and file payloads fail truthfully without contacting a scanner endpoint", async () => {
  clearApiTokens();
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => { calls += 1; throw new Error("Unexpected fetch"); }) as typeof fetch;
  try {
    await assert.rejects(analyzeUrl("upi://pay?pa=attacker@example.com"), /Sign in to analyze payment/);
    await assert.rejects(analyzeUrl("Pay here: https://example.com/"), /direct web URLs only/);
    await assert.rejects(api.scan.file({ uri: "file:///qr.png", name: "qr.png", mimeType: "image/png" }), /Sign in to analyze QR images/);
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("signed-in camera scans still use the authenticated payload analyzer", async () => {
  setApiTokens({ accessToken: "test-token" });
  const originalFetch = globalThis.fetch;
  let calledUrl = "";
  globalThis.fetch = (async (input, init) => {
    calledUrl = String(input);
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer test-token");
    assert.deepEqual(JSON.parse(String(init?.body)), { payload: "https://example.com/" });
    return new Response(JSON.stringify({
      url: "https://example.com/",
      overallRisk: "safe",
      confidenceScore: 8,
      verificationStatus: "complete",
      unverifiedChecks: [],
      scannedAt: new Date().toISOString(),
      signals: []
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  try {
    const scan = await analyzeUrl("https://example.com/");
    assert.match(calledUrl, /\/api\/scan$/);
    assert.equal(scan.source, "backend");
  } finally {
    clearApiTokens();
    globalThis.fetch = originalFetch;
  }
});

test("an upload error does not fall back to parsing website HTML as a safe scan", async () => {
  setApiTokens({ accessToken: "test-token" });
  const originalFetch = globalThis.fetch;
  const OriginalFormData = globalThis.FormData;
  let calls = 0;
  globalThis.FormData = class { append() {} } as unknown as typeof FormData;
  globalThis.fetch = (async () => {
    calls += 1;
    return new Response(JSON.stringify({ detail: "Cannot decode QR" }), {
      status: 422,
      headers: { "Content-Type": "application/json" }
    });
  }) as typeof fetch;

  try {
    await assert.rejects(api.scan.file({ uri: "file:///qr.png", name: "qr.png", mimeType: "image/png" }), /422/);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.FormData = OriginalFormData;
    clearApiTokens();
  }
});
