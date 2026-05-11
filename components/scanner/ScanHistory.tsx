import { Text, View } from "react-native";
import { useScanStore } from "@/stores/scanStore";
import { theme } from "@/constants/theme";

export function ScanHistory() {
  const history = useScanStore((state) => state.history.slice(0, 5));
  return (
    <View style={{ gap: 8 }}>
      {history.map((scan) => (
        <Text key={scan.id} numberOfLines={1} style={{ color: theme.colors.textSecondary }}>{scan.url}</Text>
      ))}
    </View>
  );
}
