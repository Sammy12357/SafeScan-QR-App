import { Feather } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { colors, spacing, typography } from "@/constants/theme";
import type { Signal } from "@/services/api";

const badgeConfig = {
  high: { bg: colors.dangerDim, text: colors.danger, icon: "x-circle" },
  medium: { bg: colors.suspiciousDim, text: colors.suspicious, icon: "alert-triangle" },
  low: { bg: colors.safeDim, text: colors.safe, icon: "check-circle" }
} as const;

export function SeverityBadge({ severity }: { severity: Signal["severity"] }) {
  const config = badgeConfig[severity];

  return (
    <View
      accessibilityLabel={`${severity} severity signal`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: config.bg,
        borderRadius: spacing.badgeRadius,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: `${config.text}66`
      }}
    >
      <Feather name={config.icon} size={11} color={config.text} style={{ marginRight: 5 }} />
      <Text style={{ ...typography.badge, color: config.text }}>{severity.toUpperCase()}</Text>
    </View>
  );
}
