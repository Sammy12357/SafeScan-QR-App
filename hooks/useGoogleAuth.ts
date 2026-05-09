import { useCallback, useEffect, useState } from "react";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import { BackHandler, Platform } from "react-native";
import { config } from "@/constants/config";
import { useAuthStore } from "@/stores/authStore";

WebBrowser.maybeCompleteAuthSession();

export function useGoogleAuth() {
  const router = useRouter();
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: config.googleWebClientId || undefined,
    androidClientId: config.googleAndroidClientId || undefined,
    scopes: ["openid", "profile", "email"],
    selectAccount: true
  });

  useEffect(() => {
    if (!isLoading || Platform.OS !== "android") return undefined;

    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      try {
        WebBrowser.dismissAuthSession();
      } catch {
        // Android may already have closed the auth tab.
      }
      setIsLoading(false);
      setError(null);
      return true;
    });

    return () => subscription.remove();
  }, [isLoading]);

  useEffect(() => {
    const completeSignIn = async () => {
      if (!response) return;

      if (response.type === "dismiss" || response.type === "cancel") {
        setIsLoading(false);
        return;
      }

      if (response.type === "error") {
        setError("Google sign-in did not complete. Please try again.");
        setIsLoading(false);
        return;
      }

      if (response.type !== "success") {
        setError("Google sign-in was interrupted. Please try again.");
        setIsLoading(false);
        return;
      }

      const idToken = response.params.id_token;
      if (!idToken) {
        setError("Google did not return an ID token. Check the OAuth client configuration.");
        setIsLoading(false);
        return;
      }

      try {
        await loginWithGoogle(idToken);
        router.replace("/(tabs)/scanner");
      } catch (authError) {
        setError(authError instanceof Error ? authError.message : "SafeScan sign-in failed.");
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

  return {
    signIn,
    isLoading,
    error
  };
}
