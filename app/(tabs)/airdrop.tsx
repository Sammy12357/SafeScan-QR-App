import { useEffect } from "react";
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

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  const currentTierNumber = Math.max(1, Math.min(tiers.length, status?.tier ?? 1));
  const currentTier = tiers.find((tier) => tier.tier === currentTierNumber) ?? tiers[0];
  const totalScans = status?.totalScans ?? status?.scanCount ?? 0;
  const nextTierAt = status?.nextTierAt ?? currentTier.scanThreshold;
  const progress = nextTierAt > 0 ? (totalScans / nextTierAt) * 100 : 100;
  const referralCode = referral?.referralCode || referral?.code || status?.referralCode || "SQR";
  const referralLink = referral?.referralLink || referral?.link || status?.referralLink || `https://safescan-qr.onrender.com/?ref=${referralCode}`;
  const totalReferrals = referral?.totalReferrals ?? referral?.referrals ?? status?.referrals ?? 0;

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

      <View className="rounded-web border border-primaryDim bg-surfaceElevated p-5">
        <View className="flex-row flex-wrap items-start justify-between gap-4">
          <View className="min-w-[112px] flex-1">
            <Text className="font-semibold text-xs uppercase tracking-widest text-accent">Current tier</Text>
            <Text className="mt-2 font-semibold text-4xl text-textPrimary">{currentTier.tier}</Text>
            <Text className="font-semibold text-xl text-textPrimary">{currentTier.name}</Text>
          </View>
          <View className="max-w-full rounded-web border border-primaryDim bg-primaryDim px-4 py-3">
            <Text className="font-semibold text-xs uppercase tracking-widest text-accent">Allocation</Text>
            <Text className="mt-1 font-semibold text-lg text-textPrimary" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
              {currentTier.allocation}
            </Text>
          </View>
        </View>

        <View className="mt-6 gap-3">
          <ProgressBar progress={progress} />
          <Text className="font-ui text-sm text-textSecondary">{currentTier.requirement}</Text>
        </View>
      </View>

      <View className="rounded-web border border-border bg-surface p-5">
        <Text className="font-semibold text-xs uppercase tracking-widest text-accent">Referral</Text>
        <Pressable accessibilityRole="button" onPress={copyReferralCode} className="mt-4 self-start rounded-pill border border-border bg-surfaceElevated px-4 py-3">
          <Text className="font-mono text-base text-textPrimary">{referralCode}</Text>
        </Pressable>
        <View className="mt-5 flex-row gap-3">
          <View className="flex-1 rounded-web border border-border p-3">
            <Text className="font-mono text-2xl text-textPrimary">{totalReferrals}</Text>
            <Text className="font-ui text-sm text-textSecondary">Total referrals</Text>
          </View>
          <View className="flex-1 rounded-web border border-border p-3">
            <Text className="font-mono text-2xl text-textPrimary">{totalScans}</Text>
            <Text className="font-ui text-sm text-textSecondary">Total scans</Text>
          </View>
        </View>
        <View className="mt-5 gap-3">
          <Button title="Share Referral Link" onPress={shareReferralLink} />
          <Button title="Admin Distribution Pending" variant="secondary" disabled />
        </View>
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
