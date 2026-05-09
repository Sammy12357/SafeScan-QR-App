import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/Button";
import { tiers } from "@/constants/tiers";
import { theme } from "@/constants/theme";
import { api } from "@/services/api";
import { useAirdropStore } from "@/stores/airdropStore";
import { useAuthStore } from "@/stores/authStore";
import { useScanStore } from "@/stores/scanStore";
import { useWallet } from "@/hooks/useWallet";

function initialsFor(name?: string | null, email?: string | null) {
  const source = (name?.trim() || email?.split("@")[0] || "SafeScan").replace(/[^a-zA-Z0-9 ]/g, " ");
  const parts = source.split(" ").filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function truncateMiddle(value: string, visible = 6) {
  if (value.length <= visible * 2 + 3) return value;
  return `${value.slice(0, visible)}...${value.slice(-visible)}`;
}

function StatCard({ value, label }: { value: string | number; label: string }) {
  const isLongText = typeof value === "string" && value.length > 5;

  return (
    <View style={{ flex: 1, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, padding: 12, backgroundColor: theme.colors.surface }}>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.65}
        style={{
          color: theme.colors.textPrimary,
          fontSize: isLongText ? 18 : 20,
          fontFamily: isLongText ? theme.fonts.sansSemiBold : theme.fonts.display
        }}
      >
        {value}
      </Text>
      <Text style={{ color: theme.colors.textSecondary, marginTop: 4, fontFamily: theme.fonts.sans }}>{label}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, backgroundColor: theme.colors.surface, padding: 16, gap: 12 }}>
      <Text style={{ color: theme.colors.textPrimary, fontSize: 18, fontFamily: theme.fonts.sansSemiBold }}>{title}</Text>
      {children}
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const history = useScanStore((state) => state.history);
  const airdropStatus = useAirdropStore((state) => state.status);
  const referral = useAirdropStore((state) => state.referral);
  const fetchAirdropStatus = useAirdropStore((state) => state.fetchStatus);
  const { connect, disconnect, publicKey, isConnected, isConnecting } = useWallet();
  const [avatarUri, setAvatarUri] = useState(user?.avatarUrl ?? null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  useEffect(() => {
    fetchAirdropStatus().catch(() => undefined);
  }, [fetchAirdropStatus]);

  useEffect(() => {
    setAvatarUri(user?.avatarUrl ?? null);
  }, [user?.avatarUrl]);

  const displayName = user?.name || "SafeScan user";
  const displayEmail = user?.email || "Signed in";
  const initials = useMemo(() => initialsFor(displayName, displayEmail), [displayEmail, displayName]);
  const totalScans = airdropStatus?.totalScans ?? airdropStatus?.scanCount ?? history.length;
  const tierNumber = airdropStatus?.tier ?? tiers.find((tier) => tier.name === airdropStatus?.currentTier)?.tier ?? 1;
  const tierLabel = airdropStatus?.currentTier ?? tiers.find((tier) => tier.tier === tierNumber)?.name ?? "Pending";
  const referralCount = referral?.totalReferrals ?? referral?.referrals ?? airdropStatus?.referrals ?? 0;

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Photo access needed", "Allow photo access to choose a profile image.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8
    });
    if (!result.canceled) setAvatarUri(result.assets[0]?.uri ?? null);
  };

  const handleConnectWallet = async () => {
    setWalletError(null);
    try {
      await connect();
    } catch (error) {
      setWalletError(error instanceof Error ? error.message : "Could not connect Solana wallet.");
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await logout();
      router.replace("/auth/google");
    } finally {
      setIsSigningOut(false);
    }
  };

  const confirmDeleteAccount = () => {
    Alert.alert("Delete account?", "This permanently deletes your SafeScan account data.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setIsDeleting(true);
          try {
            await api.user.delete();
            await logout();
            router.replace("/auth/google");
          } catch (error) {
            Alert.alert("Delete failed", error instanceof Error ? error.message : "Could not delete your account.");
          } finally {
            setIsDeleting(false);
          }
        }
      }
    ]);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: insets.top + 24, gap: 16, paddingBottom: Math.max(insets.bottom, 20) + 36 }}
    >
      <View style={{ borderColor: theme.colors.border, borderWidth: 1, borderRadius: 8, backgroundColor: theme.colors.surfaceElevated, padding: 16, gap: 14, ...theme.shadows.cardSubtle }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <Pressable accessibilityRole="button" onPress={pickAvatar} style={{ width: 72, height: 72, borderRadius: 36, overflow: "hidden", backgroundColor: theme.colors.primaryDim, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.colors.primaryGlow }}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={{ width: 72, height: 72 }} />
            ) : (
              <Text style={{ color: theme.colors.primary, fontSize: 24, fontFamily: theme.fonts.display }}>{initials}</Text>
            )}
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ color: theme.colors.textPrimary, fontSize: 24, fontFamily: theme.fonts.sansSemiBold }}>
              {displayName}
            </Text>
            <Text numberOfLines={1} style={{ color: theme.colors.textSecondary, marginTop: 4, fontFamily: theme.fonts.sans }}>
              {displayEmail}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <StatCard value={totalScans} label="Total scans" />
          <StatCard value={tierLabel} label="Airdrop tier" />
          <StatCard value={referralCount} label="Referrals" />
        </View>
      </View>

      <Section title="Solana Wallet">
        {isConnected && publicKey ? (
          <View style={{ gap: 12 }}>
            <View style={{ borderRadius: 8, borderWidth: 1, borderColor: theme.colors.primaryGlow, backgroundColor: theme.colors.primaryDim, paddingHorizontal: 12, paddingVertical: 10 }}>
              <Text style={{ color: theme.colors.primary, fontFamily: theme.fonts.mono }}>{truncateMiddle(publicKey)}</Text>
            </View>
            <Button title="Disconnect" variant="secondary" onPress={disconnect} />
          </View>
        ) : (
          <Button title={isConnecting ? "Connecting..." : "Connect Solana Wallet"} onPress={handleConnectWallet} disabled={isConnecting} style={{ backgroundColor: theme.colors.primaryStrong, borderColor: theme.colors.primaryStrong }} />
        )}
        {isConnecting ? <ActivityIndicator color={theme.colors.primary} /> : null}
        {walletError ? <Text style={{ color: theme.colors.danger, fontFamily: theme.fonts.sans }}>{walletError}</Text> : null}
      </Section>

      <Section title="Legal">
        <Pressable onPress={() => router.push("/legal/privacy")} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10 }}>
          <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.sans }}>Privacy Policy</Text>
          <Feather name="chevron-right" size={18} color={theme.colors.textSecondary} />
        </Pressable>
        <Pressable onPress={() => router.push("/legal/terms")} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
          <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.sans }}>Terms</Text>
          <Feather name="chevron-right" size={18} color={theme.colors.textSecondary} />
        </Pressable>
      </Section>

      <Section title="Danger Zone">
        <Button title={isDeleting ? "Deleting..." : "Delete Account"} variant="danger" disabled={isDeleting} onPress={confirmDeleteAccount} />
      </Section>

      <Button title={isSigningOut ? "Signing Out..." : "Sign Out"} variant="secondary" disabled={isSigningOut} onPress={handleSignOut} />
    </ScrollView>
  );
}
