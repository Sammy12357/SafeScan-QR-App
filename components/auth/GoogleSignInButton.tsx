import { Pressable, Text, View } from "react-native";
import { theme } from "@/constants/theme";

export function GoogleSignInButton({ onPress, disabled = false }: { onPress?: () => void; disabled?: boolean }) {
  return (
    <View style={{ gap: 8 }}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        style={{ minHeight: 44, borderRadius: 12, backgroundColor: theme.colors.surfaceElevated, borderWidth: 1, borderColor: theme.colors.border, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10, opacity: disabled ? 0.55 : 1 }}
      >
        <View style={{ width: 24, height: 24, borderRadius: 999, backgroundColor: theme.colors.textPrimary, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: theme.colors.blue, fontSize: 16, fontFamily: theme.fonts.sansSemiBold }}>G</Text>
        </View>
        <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.sansMedium }}>Sign in with Google</Text>
      </Pressable>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>Opens Google's secure sign-in prompt.</Text>
    </View>
  );
}
