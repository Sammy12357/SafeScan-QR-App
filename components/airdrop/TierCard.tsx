import { Feather } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { Card } from "@/components/ui/Card";
import { colors, typography } from "@/constants/theme";
import type { tiers } from "@/constants/tiers";

type Tier = (typeof tiers)[number];

export function TierCard({ tier, unlocked, compact = false }: { tier: Tier; unlocked: boolean; compact?: boolean }) {
  const allocationLabel = compact ? tier.allocation.toUpperCase().replace(" ", "\n") : tier.allocation.toUpperCase();

  return (
    <Card
      style={{
        opacity: unlocked ? 1 : 0.5,
        minHeight: compact ? 128 : 170,
        flex: compact ? 1 : undefined,
        padding: compact ? 10 : 22,
        borderColor: unlocked ? colors.primary : colors.surfaceBorder,
        backgroundColor: unlocked ? colors.primaryDim : colors.surface,
        position: "relative",
        overflow: "hidden"
      }}
    >
      {!unlocked ? (
        <View style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", opacity: 0.2 }}>
          <Feather name="lock" size={compact ? 30 : 54} color={colors.textPrimary} />
        </View>
      ) : null}
      <Text style={{ ...typography.tierRank, fontSize: compact ? 10 : 13, letterSpacing: compact ? 1.2 : 2.1 }}>{tier.rank.toUpperCase()}</Text>
      <Text style={{ ...typography.h3, fontSize: compact ? 15 : 22, marginTop: compact ? 6 : 8 }}>{tier.name}</Text>
      {!compact ? <Text style={{ ...typography.body, marginTop: 8 }}>{tier.requirement}</Text> : null}
      <View style={{ alignSelf: compact ? "stretch" : "flex-start", marginTop: "auto", borderRadius: compact ? 8 : 999, backgroundColor: colors.primaryDim, borderWidth: 1, borderColor: colors.primary, paddingHorizontal: compact ? 6 : 12, paddingVertical: compact ? 6 : 9 }}>
        <Text style={{ ...typography.tierReward, fontSize: compact ? 8 : 12, lineHeight: compact ? 11 : undefined, textAlign: compact ? "center" : "left" }}>{allocationLabel}</Text>
      </View>
    </Card>
  );
}
