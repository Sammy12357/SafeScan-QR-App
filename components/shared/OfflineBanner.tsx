import { Text, View } from "react-native";
import { theme } from "@/constants/theme";

export function OfflineBanner() {
  return (
    <View style={{ backgroundColor: theme.colors.danger, padding: 10 }}>
      <Text style={{ color: theme.colors.textPrimary, textAlign: "center" }}>You are offline. Results may be delayed.</Text>
    </View>
  );
}
