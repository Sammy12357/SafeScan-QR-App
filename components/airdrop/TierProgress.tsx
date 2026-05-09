import { Text, View } from "react-native";
import { theme } from "@/constants/theme";

export function TierProgress({ value, total }: { value: number; total: number }) {
  const pct = Math.min(100, Math.round((value / total) * 100));
  return (
    <View style={{ gap: 8 }}>
      <View style={{ height: 10, borderRadius: 999, backgroundColor: theme.colors.border, overflow: "hidden" }}>
        <View style={{ width: `${pct}%`, height: "100%", backgroundColor: theme.colors.accent }} />
      </View>
      <Text style={{ color: theme.colors.textSecondary }}>{value} / {total}</Text>
    </View>
  );
}
