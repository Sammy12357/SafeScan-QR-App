import { useState } from "react";
import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { Pressable, Text, View } from "react-native";
import { Card } from "@/components/ui/Card";
import { colors, fonts, typography } from "@/constants/theme";

const tokenAddress = "Bpdt7Hey78HeEEr9Q6x19gYAns5n6w44LdjJhxN3pump";

export function TokenInfoCard() {
  const [copied, setCopied] = useState(false);

  return (
    <Card style={{ borderLeftWidth: 3, borderLeftColor: colors.primary, borderColor: colors.surfaceBorder, backgroundColor: colors.surface }}>
      <Text style={{ ...typography.h3 }}>SafeScan Token</Text>
      <Text style={{ color: colors.primary, fontFamily: fonts.sansSemiBold, fontSize: 34, marginTop: 8 }}>SQR</Text>

      <View style={{ marginTop: 16, borderWidth: 1, borderColor: colors.surfaceBorder, borderRadius: 8, backgroundColor: colors.surfaceElevated, padding: 12 }}>
        <Text style={{ ...typography.eyebrow, fontSize: 11, marginBottom: 6 }}>CONTRACT ADDRESS</Text>
        <Text style={{ ...typography.mono, fontFamily: fonts.mono }}>{`${tokenAddress.slice(0, 8)}...${tokenAddress.slice(-8)}`}</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={async () => {
          await Clipboard.setStringAsync(tokenAddress);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        }}
        style={({ pressed }) => ({
          marginTop: 12,
          borderWidth: 1,
          borderColor: colors.primary,
          borderRadius: 8,
          paddingVertical: 12,
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "center",
          transform: [{ scale: pressed ? 0.97 : 1 }]
        })}
      >
        <Feather name="copy" size={16} color={colors.primary} style={{ marginRight: 8 }} />
        <Text style={{ color: colors.primary, fontFamily: fonts.display, fontSize: 13 }}>{copied ? "Copied!" : "Copy Contract"}</Text>
      </Pressable>
    </Card>
  );
}
