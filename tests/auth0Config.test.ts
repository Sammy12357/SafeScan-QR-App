import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { AUTH0_CLIENT_ID, AUTH0_DOMAIN } from "../constants/auth0";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("mobile Auth0 tenant matches the Android callback configuration", () => {
  assert.equal(AUTH0_DOMAIN, "safe-scan-qr.us.auth0.com");
  assert.equal(AUTH0_CLIENT_ID, "MPettOuBPUwtgifGOlt6NpJR4rl8BuL7");
  const manifest = readFileSync(`${repoRoot}/android/app/src/main/AndroidManifest.xml`, "utf8");
  const gradle = readFileSync(`${repoRoot}/android/app/build.gradle`, "utf8");
  const signIn = readFileSync(`${repoRoot}/hooks/useGoogleAuth.ts`, "utf8");
  const appConfig = JSON.parse(readFileSync(`${repoRoot}/app.json`, "utf8"));
  assert.ok(manifest.includes(`android:host="${AUTH0_DOMAIN}"`));
  assert.ok(gradle.includes(`auth0Domain: "${AUTH0_DOMAIN}"`));
  assert.equal(appConfig.expo.scheme, "safescan");
  assert.ok(signIn.includes('native: "safescan://auth"'));
});
