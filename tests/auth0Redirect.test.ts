import assert from "node:assert/strict";
import test from "node:test";
import { getAuthParam, hasExpectedAuthState } from "../utils/auth0Redirect";

test("accepts only the state generated for the current Auth0 sign-in", () => {
  const callback = "safescan://auth#id_token=sample&state=expected";
  assert.equal(getAuthParam(callback, "id_token"), "sample");
  assert.equal(hasExpectedAuthState(callback, "expected"), true);
  assert.equal(hasExpectedAuthState(callback, "other"), false);
  assert.equal(hasExpectedAuthState("safescan://auth#id_token=sample", "expected"), false);
  assert.equal(hasExpectedAuthState("safescan://auth?state=expected#id_token=sample&state=attacker", "expected"), false);
  assert.equal(hasExpectedAuthState(callback, ""), false);
});

test("reads Expo proxy callback state from query parameters", () => {
  assert.equal(hasExpectedAuthState("https://auth.expo.io/@fellowbeast/safescan-android/?state=expected&code=sample", "expected"), true);
});
