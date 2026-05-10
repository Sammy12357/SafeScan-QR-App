import { useEffect, useState } from "react";
import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/Button";
import { tiers } from "@/constants/tiers";
import { theme } from "@/constants/theme";
import { useToast } from "@/components/shared/ToastProvider";
import { useAirdropStore } from "@/stores/airdropStore";
import { useAuthStore } from "@/stores/authStore";
import { useWallet } from "@/hooks/useWallet";
import { truncateMiddle } from "@/utils/url";

function ProgressBar({ progress }: { progress: number }) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(Math.max(0, Math.min(100, progress)), { duration: 650 });
  }, [progress, width]);

  const style = useAnimatedStyle(() => ({
    width: `${width.value}%`
  }));

  return (
    <View className="h-3 overflow-hidden rounded-pill bg-border">
      <Animated.View className="h-full rounded-pill bg-primary" style={style} />
    </View>
  );
}

function TierMiniCard({ tier, unlocked }: { tier: (typeof tiers)[number]; unlocked: boolean }) {
  return (
    <View className={`w-[48%] rounded-web border p-4 ${unlocked ? "border-primary bg-primaryDim" : "border-border bg-surface"}`}>
      <View className="flex-row items-center justify-between">
        <Text className="font-semibold text-xs uppercase tracking-widest text-accent">{tier.rank}</Text>
        {unlocked ? <Feather name="check-circle" size={18} color={theme.colors.safe} /> : <Feather name="lock" size={18} color={theme.colors.textSecondary} />}
      </View>
      <Text className="mt-3 font-semibold text-lg text-textPrimary">{tier.name}</Text>
      <Text className="mt-1 font-mono text-sm text-accent">{tier.allocation}</Text>
      <Text className="mt-3 font-ui text-xs leading-5 text-textSecondary">{tier.requirement}</Text>
    </View>
  );
}

export default function AirdropScreen() {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { status, referral, isLoading, error, fetchStatus } = useAirdropStore();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const userId = useAuthStore((state) => state.user?.id);
  const apiSessionVersion = useAuthStore((state) => state.apiSessionVersion);
  const hasBackendSession = useAuthStore((state) => state.hasBackendSession);
  const { connect, disconnect, publicKey, isConnected, isConnecting } = useWallet();
  const [walletError, setWalletError] = useState<string | null>(null);

  // Refetch every time a new backend session is seeded so the screen recovers
  // from sign-in races where the first fetch fired before the access token
  // landed. apiSessionVersion bumps on hydrate, Auth0 exchange, Google login,
  // and logout — that covers every transition we care about.
  useEffect(() => {
    if (!hasBackendSession) return;
    void fetchStatus();
  }, [fetchStatus, hasBackendSession, apiSessionVersion]);

  const isDemo = !isAuthenticated || userId === "demo-user";
  const currentTierNumber = Math.max(1, Math.min(tiers.length, status?.tier ?? 1));
  const currentTier = tiers.find((tier) => tier.tier === currentTierNumber) ?? tiers[0];
  const totalScans = status?.totalScans ?? status?.scanCount ?? 0;
  const nextTierAt = status?.nextTierAt ?? currentTier.scanThreshold;
  const progress = nextTierAt > 0 ? (totalScans / nextTierAt) * 100 : 100;
  const referralCode = referral?.referralCode || referral?.code || status?.referralCode || "SQR";
  const referralLink = referral?.referralLink || referral?.link || status?.referralLink || `https://safescan-qr.onrender.com/?ref=${referralCode}`;
  const totalReferrals = referral?.totalReferrals ?? referral?.referrals ?? status?.referrals ?? 0;
  const walletAddress = publicKey || status?.walletAddress || null;
  const walletConnected = isConnected || Boolean(status?.walletConnected && status.walletAddress);

  const copyReferralCode = async () => {
    await Clipboard.setStringAsync(referralCode);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    showToast("Referral code copied.", "success");
  };

  const shareReferralLink = async () => {
    const report = `Join the SafeScan SQR airdrop: ${referralLink}`;
    const uri = `${FileSystem.cacheDirectory}safescan-referral.txt`;
    await FileSystem.writeAsStringAsync(uri, report);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: "text/plain", dialogTitle: "Share SafeScan referral" });
    } else {
      await Clipboard.setStringAsync(referralLink);
    }
    showToast("Referral link ready to share.", "success");
  };

  const handleConnectWallet = async () => {
    setWalletError(null);
    try {
      await connect();
      showToast("Solana wallet connected.", "success");
      void fetchStatus();
    } catch (err) {
      setWalletError(err instanceof Error ? err.message : "Could not connect Solana wallet.");
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: insets.top + 28, paddingBottom: Math.max(insets.bottom, 20) + 36, gap: 18 }}
    >
      <View className="gap-2">
        <Text className="font-semibold text-xs uppercase tracking-widest text-accent">Community allocation</Text>
        <Text className="font-semibold text-3xl text-textPrimary">SQR Airdrop</Text>
      </View>

      {isLoading ? <ActivityIndicator color={theme.colors.accent} /> : null}
      {error ? <Text className="rounded-web border border-risk-danger-border bg-risk-danger-bg p-3 text-center font-ui text-risk-danger-text">{error}</Text> : null}

      <View className="gap-4 rounded-web border border-primaryDim bg-surfaceElevated p-5">
        <View className="flex-row items-center justify-between">
          <Text className="font-semibold text-xs uppercase tracking-widest text-accent">Current tier</Text>
          <View className="rounded-pill border border-primaryDim bg-primaryDim px-3 py-1">
            <Text className="font-mono text-xs text-accent">Tier {currentTier.tier} of {tiers.length}</Text>
          </View>
        </View>

        <View className="gap-1">
          <Text className="font-semibold text-3xl text-textPrimary">{currentTier.name}</Text>
          <Text className="font-mono text-base text-accent">{currentTier.allocation}</Text>
        </View>

        <View className="gap-2">
          <ProgressBar progress={progress} />
          <View className="flex-row items-center justify-between">
            <Text className="font-mono text-xs text-textSecondary">{totalScans} scans</Text>
            <Text className="font-mono text-xs text-textSecondary">{nextTierAt > 0 ? `${nextTierAt} for next tier` : "Max tier reached"}</Text>
          </View>
          <Text className="font-ui text-sm text-textSecondary">{currentTier.requirement}</Text>
        </View>
      </View>

      <View className="gap-3 rounded-web border border-border bg-surface p-5">
        <Text className="font-semibold text-xs uppercase tracking-widest text-accent">Solana wallet</Text>
        {walletConnected && walletAddress ? (
          <View className="gap-3">
            <View className="rounded-web border border-primaryDim bg-primaryDim px-3 py-3">
              <Text className="font-mono text-sm text-primary">{truncateMiddle(walletAddress, 20)}</Text>
            </View>
            <Button title="Disconnect Wallet" variant="secondary" onPress={disconnect} />
          </View>
        ) : (
          <View className="gap-3">
            <Text className="font-ui text-sm leading-5 text-textSecondary">
              {isDemo
                ? "Sign in with Google to claim a wallet-linked airdrop tier."
                : "Connect a Solana wallet via Phantom. SafeScan signs a no-fee challenge — no transaction is sent."}
            </Text>
            <Button
              title={isDemo ? "Sign in with Google to Connect" : isConnecting ? "Connecting…" : "Connect Solana Wallet"}
              onPress={handleConnectWallet}
              disabled={isConnecting}
            />
            {isConnecting ? <ActivityIndicator color={theme.colors.primary} /> : null}
            {walletError ? <Text className="font-ui text-sm text-danger">{walletError}</Text> : null}
          </View>
        )}
      </View>

      <View className="gap-3 rounded-web border border-border bg-surface p-5">
        <Text className="font-semibold text-xs uppercase tracking-widest text-accent">Referral</Text>
        <Pressable accessibilityRole="button" onPress={copyReferralCode} className="self-start rounded-pill border border-border bg-surfaceElevated px-4 py-3">
          <Text className="font-mono text-base text-textPrimary">{referralCode}</Text>
        </Pressable>
        <View className="flex-row gap-3">
          <View className="flex-1 rounded-web border border-border p-3">
            <Text className="font-mono text-2xl text-textPrimary">{totalReferrals}</Text>
            <Text className="font-ui text-sm text-textSecondary">Total referrals</Text>
          </View>
          <View className="flex-1 rounded-web border border-border p-3">
            <Text className="font-mono text-2xl text-textPrimary">{totalScans}</Text>
            <Text className="font-ui text-sm text-textSecondary">Total scans</Text>
          </View>
        </View>
        <Button title="Share Referral Link" onPress={shareReferralLink} />
      </View>

      <View className="gap-3">
        <Text className="font-semibold text-xs uppercase tracking-widest text-accent">All tiers</Text>
        <View className="flex-row flex-wrap justify-between gap-y-3">
          {tiers.map((tier) => (
            <TierMiniCard key={tier.id} tier={tier} unlocked={currentTierNumber >= tier.tier} />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
