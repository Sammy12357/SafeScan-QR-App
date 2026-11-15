import { useCallback, useState } from "react";
import * as AuthSession from "expo-auth-session";
import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import { SafeScanApiError } from "@/services/api";
import { useAuthStore } from "@/stores/authStore";

WebBrowser.maybeCompleteAuthSession();

const AUTH0_DOMAIN = "dev-vnllaqnkkegs4xni.us.auth0.com";
const AUTH0_CLIENT_ID = "1XfWxWOtDtN18JCCztRehzcJ1jOSBBic";
const EXPO_GO_AUTH0_REDIRECT_URI = "https://auth.expo.io/@fellowbeast/safescan-android/";
const EXPO_PROXY_START_URL = "https://auth.expo.io/@fellowbeast/safescan-android/start";

function getAuthParam(url: string, key: string) {
  const queryString = url.includes("?") ? url.split("?")[1].split("#")[0] : "";
  const hashString = url.includes("#") ? url.split("#")[1] : "";
  return new URLSearchParams(queryString).get(key) ?? new URLSearchParams(hashString).get(key);
}

function getExpoHostUri() {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    Constants.manifest2?.extra?.expoClient?.hostUri ??
    Constants.manifest?.debuggerHost;

  return hostUri?.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/\/$/, "");
}

function getAuthRedirectUri() {
  if (Constants.executionEnvironment === "storeClient") {
    return EXPO_GO_AUTH0_REDIRECT_URI;
  }

  const hostUri = getExpoHostUri();
  if (hostUri) return `exp://${hostUri}/--/auth`;
  return AuthSession.makeRedirectUri({
    path: "auth"
  });
}

// Auth0 Universal Login pre-targeted at Google. The flow is:
//   1. Auth0 returns Credentials with an idToken (JWT signed by SafeScan tenant).
//   2. The backend either returns a SafeScan session or a short-lived age
//      challenge. A challenge never creates an app session.
//   3. The age response is submitted to SafeScan before entering account
//      screens. If exchange fails, the user can still choose explicit demo mode.
//
export function useGoogleAuth() {
  const exchangeAuth0IdToken = useAuthStore((state) => state.exchangeAuth0IdToken);
  const completeAgeChallenge = useAuthStore((state) => state.completeAgeChallenge);
  const ageChallenge = useAuthStore((state) => state.ageChallenge);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const redirectUri = getAuthRedirectUri();
      const authUrl =
        `https://${AUTH0_DOMAIN}/authorize?` +
        new URLSearchParams({
          client_id: AUTH0_CLIENT_ID,
          redirect_uri: redirectUri,
          response_type: "id_token",
          scope: "openid profile email",
          connection: "google-oauth2",
          nonce: String(Date.now())
        }).toString();

      const returnUrl = Constants.executionEnvironment === "storeClient" ? AuthSession.getDefaultReturnUrl() : redirectUri;
      const browserUrl =
        Constants.executionEnvironment === "storeClient"
          ? `${EXPO_PROXY_START_URL}?${new URLSearchParams({ authUrl, returnUrl }).toString()}`
          : authUrl;
      const result = await WebBrowser.openAuthSessionAsync(browserUrl, returnUrl);
      if (result.type !== "success") {
        if (result.type === "cancel") setError("Sign-in was cancelled.");
        return;
      }

      const idToken = getAuthParam(result.url, "id_token");
      if (!idToken) {
        setError("Auth0 did not return an ID token.");
        return;
      }

      await exchangeAuth0IdToken(idToken);
    } catch (e) {
      setError(e instanceof Error ? `Sign-in could not finish: ${e.message}` : "Sign-in could not finish. Try again.");
    } finally {
      setIsLoading(false);
    }
  }, [exchangeAuth0IdToken]);

  const confirmAge = useCallback(async (birthYear: number, birthdayThisYear: "yes" | "no") => {
    setError(null);
    setIsLoading(true);
    try {
      await completeAgeChallenge(birthYear, birthdayThisYear);
    } catch (e) {
      if (e instanceof SafeScanApiError && e.status === 403) {
        setError("SafeScan account sign-in is unavailable for this age. You can use the public scanner without an account.");
      } else if (e instanceof SafeScanApiError && (e.status === 409 || e.status === 410)) {
        setError("This age check can no longer be used. Start sign-in again later.");
      } else {
        setError("Age confirmation could not finish. Check your connection and try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [completeAgeChallenge]);

  return {
    signIn,
    confirmAge,
    ageChallenge,
    isLoading,
    error,
  };
}
