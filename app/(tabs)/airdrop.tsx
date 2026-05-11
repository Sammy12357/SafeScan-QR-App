import { useEffect, useRef, useState } from "react";
import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { ActivityIndicator, Pressable, ScrollView, Share, Text, View } from "react-native";
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

function TierDetailCard({
  tier,
  unlocked,
  current,
  onPrevious,
  onNext,
  canPrevious,
  canNext
}: {
  tier: (typeof tiers)[number];
  unlocked: boolean;
  current: boolean;
  onPrevious: () => void;
  onNext: () => void;
  canPrevious: boolean;
  canNext: boolean;
}) {
  return (
    <View className={`rounded-web border p-5 ${unlocked ? "border-primary bg-primaryDim" : "border-border bg-surface"}`}>
      <View className="flex-row items-center justify-between gap-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous tier"
          disabled={!canPrevious}
          onPress={onPrevious}
          className="h-10 w-10 items-center justify-center rounded-web border border-border bg-surfaceElevated"
          style={{ opacity: canPrevious ? 1 : 0.35 }}
        >
          <Feather name="chevron-left" size={20} color={theme.colors.textPrimary} />
        </Pressable>

        <View className="min-w-0 flex-1 items-center">
          <Text className="font-display text-xs uppercase tracking-widest text-accent">{tier.rank}</Text>
          <Text className="mt-2 text-center font-display text-2xl text-textPrimary">{tier.name}</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next tier"
          disabled={!canNext}
          onPress={onNext}
          className="h-10 w-10 items-center justify-center rounded-web border border-border bg-surfaceElevated"
          style={{ opacity: canNext ? 1 : 0.35 }}
        >
          <Feather name="chevron-right" size={20} color={theme.colors.textPrimary} />
        </Pressable>
      </View>

      <View className="mt-5 flex-row items-center justify-between gap-3">
        <View className="rounded-pill border border-primaryDim bg-surfaceElevated px-3 py-1">
          <Text className="font-display text-xs uppercase tracking-widest text-accent">{tier.allocation}</Text>
        </View>
        <View className={`rounded-pill border px-3 py-1 ${unlocked ? "border-risk-safe-border bg-risk-safe-bg" : "border-border bg-surfaceElevated"}`}>
          <Text className={`font-display text-xs uppercase tracking-widest ${unlocked ? "text-safe" : "text-textSecondary"}`}>
            {current ? "Current" : unlocked ? "Unlocked" : "Locked"}
          </Text>
        </View>
      </View>

      <Text className="mt-4 font-ui text-sm leading-6 text-textSecondary">{tier.requirement}</Text>
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
  const [selectedTierIndex, setSelectedTierIndex] = useState(0);
  const [referralCopied, setReferralCopied] = useState(false);
  const referralCopiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const selectedTier = tiers[selectedTierIndex] ?? currentTier;
  const totalScans = status?.totalScans ?? status?.scanCount ?? 0;
  const nextTierAt = status?.nextTierAt ?? currentTier.scanThreshold;
  const progress = nextTierAt > 0 ? (totalScans / nextTierAt) * 100 : 100;
  const referralCode = referral?.referralCode || referral?.code || status?.referralCode || "SQR";
  const referralLink = referral?.referralLink || referral?.link || status?.referralLink || `https://safescan-qr.onrender.com/?ref=${referralCode}`;
  const walletAddress = publicKey || status?.walletAddress || null;
  const walletVerified = Boolean(status?.walletConnected && status.walletAddress);
  const walletConnected = isConnected || walletVerified;
  const airdropState = isDemo || !hasBackendSession ? "Pending" : status?.airdropStatus ?? "Registered";
  const tierTitle = isDemo || !hasBackendSession ? "Pending Airdrop Tier" : currentTier.name;
  const tierAllocation = isDemo || !hasBackendSession ? "Sign in to activate" : currentTier.allocation;
  const progressTargetLabel = nextTierAt > 0 ? `${nextTierAt} target` : "Max tier reached";

  useEffect(() => {
    setSelectedTierIndex(Math.max(0, currentTierNumber - 1));
  }, [currentTierNumber]);

  useEffect(() => {
    return () => {
      if (referralCopiedTimer.current) clearTimeout(referralCopiedTimer.current);
    };
  }, []);

  const copyReferralCode = async () => {
    await Clipboard.setStringAsync(referralCode);
    if (referralCopiedTimer.current) clearTimeout(referralCopiedTimer.current);
    setReferralCopied(true);
    referralCopiedTimer.current = setTimeout(() => {
      setReferralCopied(false);
      referralCopiedTimer.current = null;
    }, 1800);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    showToast("Referral code copied.", "success");
  };

  const shareReferralLink = async () => {
    try {
      await Share.share({
        title: "Join SafeScan QR",
        message: `Join the SafeScan SQR airdrop: ${referralLink}`,
        url: referralLink
      });
    } catch {
      await Clipboard.setStringAsync(referralLink);
    }
    showToast("Referral web address ready.", "success");
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

  const handleDisconnectWallet = async () => {
    setWalletError(null);
    try {
      await disconnect();
      showToast("Solana wallet disconnected.", "success");
      void fetchStatus();
    } catch (err) {
      setWalletError(err instanceof Error ? err.message : "Could not disconnect Solana wallet.");
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: insets.top + 28, paddingBottom: Math.max(insets.bottom, 20) + 36, gap: 18 }}
    >
      <View className="gap-2">
        <Text className="font-display text-xs uppercase tracking-widest text-accent">Community allocation</Text>
        <Text className="font-display text-3xl text-textPrimary">SQR Airdrop</Text>
      </View>

      {isLoading ? <ActivityIndicator color={theme.colors.accent} /> : null}
      {error ? <Text className="rounded-web border border-risk-danger-border bg-risk-danger-bg p-3 text-center font-ui text-risk-danger-text">{error}</Text> : null}

      <View className="gap-4 rounded-web border border-primaryDim bg-surfaceElevated p-5">
        <View className="flex-row items-center justify-between">
          <Text className="font-display text-xs uppercase tracking-widest text-accent">Airdrop tier</Text>
          <View className="rounded-pill border border-primaryDim bg-primaryDim px-3 py-1">
            <Text className="font-mono text-xs text-accent">{airdropState}</Text>
          </View>
        </View>

        <View className="gap-1">
          <Text className="font-display text-3xl text-textPrimary">{tierTitle}</Text>
          <Text className="font-mono text-base text-accent">{tierAllocation}</Text>
        </View>

        <View className="gap-2">
          <ProgressBar progress={progress} />
          <View className="flex-row items-center justify-between">
            <Text className="font-mono text-xs text-textSecondary">{totalScans} scans</Text>
            <Text className="font-mono text-xs text-textSecondary">{progressTargetLabel}</Text>
          </View>
          <Text className="font-ui text-sm text-textSecondary">{currentTier.requirement}</Text>
        </View>
      </View>

      <View className="gap-3 rounded-web border border-border bg-surface p-5">
        <Text className="font-display text-xs uppercase tracking-widest text-accent">Solana wallet</Text>
        {walletConnected && walletAddress ? (
          <View className="gap-3">
            <View className="rounded-web border border-primaryDim bg-primaryDim px-3 py-3">
              <Text className="font-mono text-sm text-primary">{truncateMiddle(walletAddress, 20)}</Text>
            </View>
            <Text className="font-ui text-sm leading-5 text-textSecondary">
              {walletVerified
                ? "Wallet verified with SafeScan for SQR eligibility."
                : "Wallet connected locally. SafeScan will verify it for SQR eligibility when the API is reachable."}
            </Text>
            <Button title="Disconnect Wallet" variant="secondary" onPress={handleDisconnectWallet} />
            {walletError ? <Text className="font-ui text-sm text-danger">{walletError}</Text> : null}
          </View>
        ) : (
          <View>
            <Text className="font-ui text-sm leading-5 text-textSecondary" style={{ marginTop: -8, marginBottom: 28 }}>
              {isDemo
                ? "Sign in with Google to claim a wallet-linked airdrop tier."
                : "Connect a Solana wallet via Phantom. SafeScan signs a no-fee challenge - no transaction is sent."}
            </Text>
            <Button
              title={isDemo ? "Sign in with Google to Connect" : isConnecting ? "Connecting..." : "Connect Solana Wallet"}
              onPress={handleConnectWallet}
              disabled={isConnecting}
            />
            {isConnecting ? <ActivityIndicator color={theme.colors.primary} /> : null}
            {walletError ? <Text className="font-ui text-sm text-danger">{walletError}</Text> : null}
          </View>
        )}
      </View>

      <View className="gap-3 rounded-web border border-border bg-surface p-5">
        <Text className="font-display text-xs uppercase tracking-widest text-accent">Referral</Text>
        <Text className="font-ui text-sm leading-5 text-textSecondary">
          Your referral code stays hidden on screen. Copy it when you need it, or share the web address directly.
        </Text>
        <View style={{ paddingTop: 4 }}>
          <Button title={referralCopied ? "Copied" : "Copy Referral Code"} variant="secondary" onPress={copyReferralCode} />
          <View style={{ height: 24 }} />
          <Button title="Share Referral Link" onPress={shareReferralLink} />
        </View>
      </View>

      <View className="gap-3">
        <View className="flex-row items-center justify-between">
          <Text className="font-display text-xs uppercase tracking-widest text-accent">Tier path</Text>
          <Text className="font-mono text-xs text-textSecondary">{selectedTierIndex + 1} / {tiers.length}</Text>
        </View>
        <TierDetailCard
          tier={selectedTier}
          unlocked={currentTierNumber >= selectedTier.tier}
          current={currentTierNumber === selectedTier.tier}
          canPrevious={selectedTierIndex > 0}
          canNext={selectedTierIndex < tiers.length - 1}
          onPrevious={() => setSelectedTierIndex((index) => Math.max(0, index - 1))}
          onNext={() => setSelectedTierIndex((index) => Math.min(tiers.length - 1, index + 1))}
        />
      </View>
    </ScrollView>
  );
}
