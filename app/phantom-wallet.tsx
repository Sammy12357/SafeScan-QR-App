import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/Button";
import { theme } from "@/constants/theme";
import { handlePhantomWalletCallback } from "@/hooks/useWallet";

function paramsToQuery(params: Record<string, string | string[]>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => query.append(key, item));
    } else if (value) {
      query.set(key, value);
    }
  });
  return query.toString();
}

export default function PhantomWalletCallbackScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const handledUrlRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Finishing wallet connection...");
  const callbackUrl = useMemo(() => {
    const query = paramsToQuery(params);
    return `${Linking.createURL("phantom-wallet")}${query ? `?${query}` : ""}`;
  }, [params]);

  useEffect(() => {
    if (handledUrlRef.current === callbackUrl) return;
    handledUrlRef.current = callbackUrl;
    setError(null);

    handlePhantomWalletCallback(callbackUrl)
      .then((result) => {
        if (result === "awaiting-signature") {
          setStatus("Opening Phantom to sign...");
          return;
        }

        setStatus("Wallet connected.");
        setTimeout(() => router.replace("/(tabs)/airdrop"), 250);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not connect wallet.");
      });
  }, [callbackUrl, router]);

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        backgroundColor: theme.colors.background,
        paddingHorizontal: 22,
        paddingTop: insets.top + 22,
        paddingBottom: Math.max(insets.bottom, 16) + 16
      }}
    >
      {error ? null : <ActivityIndicator color={theme.colors.accent} />}
      <Text style={{ color: error ? theme.colors.danger : theme.colors.textPrimary, fontFamily: theme.fonts.display, fontSize: 20, textAlign: "center" }}>
        {error ?? status}
      </Text>
      {error ? <Button title="Back to Airdrop" variant="secondary" onPress={() => router.replace("/(tabs)/airdrop")} /> : null}
    </View>
  );
}
