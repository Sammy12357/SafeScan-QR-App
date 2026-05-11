import { Text, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { theme } from "@/constants/theme";

export function ConsentBanner() {
  return (
    <View style={{ backgroundColor: theme.colors.surface, padding: 14, borderRadius: 12, gap: 10 }}>
      <Text style={{ color: theme.colors.textPrimary }}>By using SafeScan QR, you agree to our Terms and Privacy Policy.</Text>
      <Button title="Accept" />
    </View>
  );
}
