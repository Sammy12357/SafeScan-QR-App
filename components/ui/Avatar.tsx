import { Text, View } from "react-native";
import { theme } from "@/constants/theme";

export function Avatar({ name = "SafeScan" }: { name?: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "S";
  return (
    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: theme.colors.textPrimary, fontWeight: "700" }}>{initial}</Text>
    </View>
  );
}
