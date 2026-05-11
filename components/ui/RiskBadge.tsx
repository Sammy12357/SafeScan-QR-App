import { Text, View } from "react-native";
import { theme } from "@/constants/theme";

type RiskBadgeTone = "safe" | "warn" | "danger";

type RiskBadgeProps = {
  tone: RiskBadgeTone;
  label?: string;
  className?: string;
};

const badgeClass: Record<RiskBadgeTone, string> = {
  safe: "bg-risk-safe-bg border-risk-safe-border",
  warn: "bg-risk-warn-bg border-risk-warn-border",
  danger: "bg-risk-danger-bg border-risk-danger-border"
};

const textClass: Record<RiskBadgeTone, string> = {
  safe: "text-risk-safe-text",
  warn: "text-risk-warn-text",
  danger: "text-risk-danger-text"
};

export function RiskBadge({ tone, label, className = "" }: RiskBadgeProps) {
  return (
    <View className={`self-start rounded-pill border px-4 py-3 ${badgeClass[tone]} ${className}`}>
      <Text
        className={`uppercase tracking-[1.1px] ${textClass[tone]}`}
        style={{ fontFamily: theme.fonts.display, fontSize: theme.fontSizes.lockedBadge }}
      >
        {label ?? tone}
      </Text>
    </View>
  );
}
