import { useEffect, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { ActivityIndicator, Text, View } from "react-native";
import { colors, typography } from "@/constants/theme";

const steps = ["Decoding payload...", "Tracing redirects...", "Checking reputation...", "Consulting AI..."];

export function LoadingSteps({ active, complete = false }: { active: boolean; complete?: boolean }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active || complete) return;
    const id = setInterval(() => setIndex((value) => Math.min(value + 1, steps.length - 1)), 1200);
    return () => clearInterval(id);
  }, [active, complete]);

  useEffect(() => {
    if (!active) setIndex(0);
  }, [active]);

  if (!active && !complete) return null;

  return (
    <View style={{ borderWidth: 1, borderColor: colors.surfaceBorder, borderRadius: 12, backgroundColor: colors.surface, padding: 12 }}>
      {steps.map((step, stepIndex) => {
        const done = complete || stepIndex < index;
        const current = active && stepIndex === index && !complete;
        return (
          <View key={step} style={{ flexDirection: "row", alignItems: "center", marginBottom: stepIndex === steps.length - 1 ? 0 : 10 }}>
            {done ? <Feather name="check-circle" size={16} color={colors.safe} /> : current ? <ActivityIndicator color={colors.primary} size="small" /> : <View style={{ width: 16, height: 16, borderRadius: 999, borderWidth: 1, borderColor: colors.surfaceBorder }} />}
            <Text style={{ ...typography.body, marginLeft: 10, color: current ? colors.textPrimary : colors.textSecondary }}>{step}</Text>
          </View>
        );
      })}
    </View>
  );
}
