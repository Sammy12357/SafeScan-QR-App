import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/constants/theme";

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: insets.top + 28, paddingBottom: Math.max(insets.bottom, 20) + 36 }}>
      <View style={{ borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, backgroundColor: theme.colors.surface, padding: 22, gap: 16, ...theme.shadows.panel }}>
        <Text style={{ color: theme.colors.accent, fontSize: 12, fontFamily: theme.fonts.sansSemiBold, letterSpacing: 2 }}>SAFESCAN QR LEGAL</Text>
        <Text style={{ color: theme.colors.textPrimary, fontSize: 38, lineHeight: 42, fontFamily: theme.fonts.sansSemiBold }}>Privacy Policy</Text>
        <Text style={{ color: theme.colors.accent, fontFamily: theme.fonts.sansSemiBold }}>Version 1.0 - Last updated May 2026</Text>
        <Text style={{ color: theme.colors.textSecondary, lineHeight: 22 }}>
          SafeScan QR analyzes QR payloads for security risk, uses Google OAuth for authentication, and stores only the data required to provide the service.
        </Text>
        <Text style={{ color: theme.colors.textPrimary, fontSize: 20, fontFamily: theme.fonts.sansSemiBold, marginTop: 8 }}>What we collect</Text>
        <Text style={{ color: theme.colors.textSecondary, lineHeight: 22 }}>
          Google profile details for sign-in, optional wallet addresses, QR payloads for temporary security analysis, scan counts, referral activity, and basic device/session metadata for fraud prevention.
        </Text>
        <Text style={{ color: theme.colors.textPrimary, fontSize: 20, fontFamily: theme.fonts.sansSemiBold, marginTop: 8 }}>Your rights</Text>
        <Text style={{ color: theme.colors.textSecondary, lineHeight: 22 }}>
          You can request access, deletion, correction, portability, or opt-out through the SafeScan data request portal.
        </Text>
      </View>
    </ScrollView>
  );
}
