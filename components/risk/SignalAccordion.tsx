import { useState } from "react";
import { Feather } from "@expo/vector-icons";
import { LayoutAnimation, Pressable, Text, View } from "react-native";
import { SeverityBadge } from "@/components/risk/SeverityBadge";
import { colors, typography } from "@/constants/theme";
import type { Signal } from "@/services/api";

export function SignalAccordion({ signal }: { signal: Signal }) {
  const [expanded, setExpanded] = useState(false);
  const detected = signal.passed !== true;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded((value) => !value);
      }}
      style={{
        opacity: detected ? 1 : 0.4,
        backgroundColor: colors.surface,
        borderColor: colors.surfaceBorder,
        borderWidth: 1,
        borderRadius: 12,
        overflow: "hidden"
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", padding: 14 }}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={{ ...typography.h3, fontSize: 15 }}>{signal.check}</Text>
          <Text style={{ ...typography.body, marginTop: 4 }}>{signal.result}</Text>
        </View>
        <SeverityBadge severity={signal.severity} />
        <Feather name={expanded ? "chevron-down" : "chevron-right"} size={18} color={colors.textMuted} style={{ marginLeft: 10 }} />
      </View>
      {expanded ? <Text style={{ ...typography.body, paddingHorizontal: 14, paddingBottom: 14 }}>{signal.description}</Text> : null}
    </Pressable>
  );
}
