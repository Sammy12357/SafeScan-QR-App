import { Link } from "expo-router";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/Button";
import { theme } from "@/constants/theme";

export default function NotFoundScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, paddingTop: insets.top + 22, paddingBottom: Math.max(insets.bottom, 16) + 16 }}>
      <Text style={{ color: theme.colors.textPrimary, fontSize: 24, marginBottom: 12 }}>Screen not found</Text>
      <Link href="/" asChild>
        <Button title="Back home" variant="secondary" />
      </Link>
    </View>
  );
}
