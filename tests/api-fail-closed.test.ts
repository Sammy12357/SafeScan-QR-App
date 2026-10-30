import assert from "node:assert/strict";
import test from "node:test";
import { analyzeUrl, api } from "../services/api";
import { getOpenPolicy } from "../utils/openPolicy";

test("backend outage rejects a scan instead of creating a mock safe verdict", async () => {
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

test("a successful backend response keeps verification metadata through the mobile API", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({
    url: "https://example.com/",
    rawPayload: "https://example.com/",
    overallRisk: "safe",
    confidenceScore: 8,
    verdict: "No known unsafe match was found.",
    verificationStatus: "complete",
    unverifiedChecks: [],
    scannedAt: new Date().toISOString(),
    signals: []
  }), { status: 200, headers: { "Content-Type": "application/json" } })) as typeof fetch;

  try {
    const scan = await analyzeUrl("https://example.com/");
    assert.equal(scan.source, "backend");
    assert.equal(scan.verificationStatus, "complete");
    assert.deepEqual(scan.unverifiedChecks, []);
    assert.equal(getOpenPolicy(scan).kind, "safe");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("an upload error does not fall back to parsing website HTML as a safe scan", async () => {
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
  }
});
