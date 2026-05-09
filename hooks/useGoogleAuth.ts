import { useCallback, useEffect, useState } from "react";
import * as Google from "expo-auth-session/providers/google";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import { BackHandler, Platform } from "react-native";
import { config } from "@/constants/config";
import { useAuthStore } from "@/stores/authStore";

// Must be called at module level — closes the browser tab when the OAuth
// redirect lands back in the app.
WebBrowser.maybeCompleteAuthSession();

export function useGoogleAuth() {
  const router = useRouter();
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use the app's own scheme which is already registered in AndroidManifest.xml.
  // The Android OAuth client validates via package name + SHA-1, not via a
  // redirect URI whitelist, so this is accepted by Google.
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: config.appScheme,          // "safescan"
    path: "oauth2redirect/google",
  });

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: config.googleWebClientId || undefined,
    androidClientId: config.googleAndroidClientId || undefined,
    scopes: ["openid", "profile", "email"],
    selectAccount: true,
    redirectUri,
  });

  // Close auth session on Android back-press
  useEffect(() => {
    if (!isLoading || Platform.OS !== "android") return undefined;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      try { WebBrowser.dismissAuthSession(); } catch { /* already closed */ }
      setIsLoading(false);
      setError(null);
      return true;
    });
    return () => sub.remove();
  }, [isLoading]);

  // Handle the OAuth response
  useEffect(() => {
    const completeSignIn = async () => {
      if (!response) return;

      if (response.type === "cancel" || response.type === "dismiss") {
        setIsLoading(false);
        return;
      }

      if (response.type === "error") {
        const desc = (response.error as { description?: string } | undefined)?.description ?? "unknown";
        setError(`Google error: ${desc}`);
        setIsLoading(false);
        return;
      }

      if (response.type !== "success") {
        setError(`Unexpected response: ${response.type}`);
        setIsLoading(false);
        return;
      }

      const idToken = response.params.id_token;
      if (!idToken) {
        const keys = Object.keys(response.params).join(", ") || "none";
        setError(`No id_token received. Params: ${keys}`);
        setIsLoading(false);
        return;
      }

      try {
        await loginWithGoogle(idToken);
        router.replace("/(tabs)/scanner");
      } catch (err) {
        setError(`Backend error: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setIsLoading(false);
      }
    };

    completeSignIn();
  }, [loginWithGoogle, response, router]);

  const signIn = useCallback(() => {
    setError(null);
    if (!config.hasGoogleClientId) {
      setError("Google sign-in needs a configured OAuth client ID.");
      return;
    }
    if (!request) {
      setError("Google sign-in is still loading. Try again in a moment.");
      return;
    }
    setIsLoading(true);
    promptAsync().then((result) => {
      if (result.type !== "success") setIsLoading(false);
    });
  }, [promptAsync, request]);

  return { signIn, isLoading, error };
}
