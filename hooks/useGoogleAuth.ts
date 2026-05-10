import { useCallback, useEffect, useState } from "react";
import { useAuth0 } from "react-native-auth0";
import { useAuthStore } from "@/stores/authStore";

const CUSTOM_SCHEME = "safescanauth0";

// Thin wrapper around Auth0 that:
//  - Opens Auth0 Universal Login pre-targeted at Google ("connection: google-oauth2")
//  - Syncs the resulting Auth0 user into our Zustand auth store
//  - Exposes the same { signIn, isLoading, error } shape the auth screen already uses
export function useGoogleAuth() {
  const { authorize, user, error: auth0Error } = useAuth0();
  const loginWithAuth0 = useAuthStore((state) => state.loginWithAuth0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When Auth0 hands us a user, mirror it into our store so the rest of the
  // app's auth-aware code (router guards, profile screen, etc.) keeps working.
  useEffect(() => {
    if (user) {
      loginWithAuth0({
        sub: user.sub,
        email: user.email,
        name: user.name,
        picture: user.picture,
      });
    }
  }, [user, loginWithAuth0]);

  const signIn = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      await authorize(
        {
          scope: "openid profile email",
          // Skip Auth0's account picker and go straight to Google
          connection: "google-oauth2",
        },
        { customScheme: CUSTOM_SCHEME }
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }, [authorize]);

  return {
    signIn,
    isLoading,
    error: error ?? auth0Error?.message ?? null,
  };
}
