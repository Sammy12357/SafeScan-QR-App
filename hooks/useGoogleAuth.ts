import { useCallback, useState } from "react";
import { useAuth0 } from "react-native-auth0";
import { useAuthStore } from "@/stores/authStore";

const CUSTOM_SCHEME = "safescanauth0";

function decodeIdTokenClaims(idToken: string): {
  sub?: string;
  email?: string;
  name?: string;
  picture?: string;
} | null {
  try {
    const b64 = idToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(b64));
  } catch {
    return null;
  }
}

// Auth0 Universal Login pre-targeted at Google. The flow is:
//   1. Auth0 returns Credentials with an idToken (JWT signed by SafeScan tenant).
//   2. We exchange that idToken at the backend's /auth/verify, which mints a
//      SafeScan session. ON SUCCESS, the auth store flips isAuthenticated=true
//      AND seeds the API access token in one atomic update — no race.
//   3. If the backend exchange fails (Render cold-start, not yet redeployed,
//      offline, etc.) we fall back to a local-only auth so the user isn't
//      locked out of the UI. They get a visible error and `hasBackendSession`
//      stays false until a future exchange succeeds.
//
// Critically: we do NOT mirror Auth0's `user` into our store via a useEffect.
// That earlier pattern flipped isAuthenticated=true while the exchange was
// still in flight, which let routing redirect into screens that immediately
// fired protected requests with no Authorization header — the source of the
// "401 in analyze and airdrop" reports.
export function useGoogleAuth() {
  const { authorize, error: auth0Error } = useAuth0();
  const loginWithAuth0 = useAuthStore((state) => state.loginWithAuth0);
  const exchangeAuth0IdToken = useAuthStore((state) => state.exchangeAuth0IdToken);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const credentials = await authorize(
        {
          scope: "openid profile email",
          // Skip Auth0's account picker and go straight to Google.
          connection: "google-oauth2",
        },
        { customScheme: CUSTOM_SCHEME }
      );

      const idToken = credentials?.idToken;
      if (!idToken) {
        setError("Auth0 did not return an ID token.");
        return;
      }

      try {
        await exchangeAuth0IdToken(idToken);
      } catch (exchangeError) {
        // Backend exchange failed. Fall back to local-only auth so the user
        // can still see the UI; protected calls will stay 401 until backend
        // is reachable AND has the Auth0-aware /auth/verify deployed.
        const claims = decodeIdTokenClaims(idToken);
        if (claims?.email) {
          loginWithAuth0({
            sub: claims.sub,
            email: claims.email,
            name: claims.name,
            picture: claims.picture,
          });
        }
        setError(
          exchangeError instanceof Error
            ? `Signed in locally — backend session unavailable: ${exchangeError.message}`
            : "Signed in locally — SafeScan backend rejected the login."
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }, [authorize, exchangeAuth0IdToken, loginWithAuth0]);

  return {
    signIn,
    isLoading,
    error: error ?? auth0Error?.message ?? null,
  };
}
