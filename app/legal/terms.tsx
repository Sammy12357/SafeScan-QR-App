import { ScrollView, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/constants/theme";

export default function TermsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: insets.top + 22, paddingBottom: Math.max(insets.bottom, 20) + 36 }}>
      <Text style={{ color: theme.colors.textPrimary, fontSize: 26, fontWeight: "700" }}>Terms of Use</Text>
      <Text style={{ color: theme.colors.textSecondary, marginTop: 12, lineHeight: 22 }}>
        SafeScan QR provides informational risk analysis only. Verdicts are not guarantees of safety.
      </Text>
    </ScrollView>
  );
}
