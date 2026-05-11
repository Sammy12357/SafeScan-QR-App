import { Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { RiskGauge } from "@/components/risk/RiskGauge";
import { SignalAccordion } from "@/components/risk/SignalAccordion";
import type { AnalyzeResponse } from "@/services/api";
import { theme } from "@/constants/theme";

const severityRank = { high: 0, medium: 1, low: 2 };

export function RiskBreakdownPanel({ result }: { result: AnalyzeResponse }) {
  const signals = [...result.signals].sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
  const tone = result.overallRisk === "high" ? "danger" : result.overallRisk === "suspicious" ? "warn" : "safe";
  const status = tone === "danger" ? "DANGEROUS" : tone === "warn" ? "CAUTION" : "SAFE";
  const accent = theme.colors.risk[tone];
  const translateY = useSharedValue(28);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withTiming(0, { duration: 320 });
    opacity.value = withTiming(1, { duration: 320 });
  }, [opacity, translateY]);

  const revealStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }]
  }));

  return (
    <Animated.View style={revealStyle}>
    <Card elevated style={{ gap: 18, backgroundColor: theme.colors.risk.card.bg, borderColor: accent.border }}>
      {result.overallRisk === "high" ? (
        <View style={{ borderRadius: 8, borderWidth: 1, borderColor: theme.colors.risk.warningBanner.border, backgroundColor: theme.colors.risk.warningBanner.bg, padding: 13 }}>
          <Text style={{ color: theme.colors.risk.warningBanner.text, fontFamily: theme.fonts.sansSemiBold, lineHeight: 20 }}>
            Caution: this QR code shows strong indicators of a phishing or wallet drain attack.
          </Text>
        </View>
      ) : null}

      <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
        <RiskGauge score={result.confidenceScore} verdict={status} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.colors.accent, fontSize: theme.fontSizes.lockedBadge, fontFamily: theme.fonts.sansSemiBold, letterSpacing: 1.7 }}>SCAN VERDICT</Text>
          <Text style={{ color: theme.colors.textPrimary, fontSize: theme.fontSizes.riskModalTitle, lineHeight: 44, fontFamily: theme.fonts.sansSemiBold, marginTop: 4 }}>{status}</Text>
          <Text style={{ color: theme.colors.textSecondary, lineHeight: 21, marginTop: 8 }}>{result.verdictText ?? result.verdict}</Text>
        </View>
      </View>

      <View style={{ borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, backgroundColor: theme.colors.surface, padding: 14 }}>
        <Text style={{ color: theme.colors.accent, fontSize: 11, fontFamily: theme.fonts.sansSemiBold, letterSpacing: 1.4 }}>DECODED URL / PAYLOAD</Text>
        <Text style={{ color: theme.colors.textPrimary, lineHeight: 21, marginTop: 8, fontFamily: theme.fonts.mono }}>{result.url}</Text>
      </View>

      <View style={{ borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, backgroundColor: theme.colors.surface, padding: 12, flexDirection: "row", gap: 10, alignItems: "center" }}>
        <View style={{ borderRadius: 999, borderWidth: 1, borderColor: result.source === "backend" ? theme.colors.risk.safe.border : theme.colors.risk.warn.border, backgroundColor: result.source === "backend" ? theme.colors.risk.safe.bg : theme.colors.risk.warn.bg, paddingHorizontal: 10, paddingVertical: 6 }}>
          <Text style={{ color: result.source === "backend" ? theme.colors.safe : theme.colors.suspicious, fontSize: 11, fontFamily: theme.fonts.sansSemiBold }}>{result.source === "backend" ? "LIVE API" : "DEMO FALLBACK"}</Text>
        </View>
        <Text style={{ color: theme.colors.textSecondary, flex: 1 }}>SafeScan backend: safescan-qr.onrender.com</Text>
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <View>
          <Text style={{ color: theme.colors.accent, fontSize: 11, fontFamily: theme.fonts.sansSemiBold, letterSpacing: 1.4 }}>CONFIDENCE BREAKDOWN</Text>
          <Text style={{ color: theme.colors.textPrimary, fontSize: 20, fontFamily: theme.fonts.sansSemiBold, marginTop: 4 }}>{result.confidenceScore} / 100 risk score</Text>
        </View>
        <RiskBadge tone={tone} label={status} />
      </View>

      {signals.map((signal) => (
        <SignalAccordion key={`${signal.check}-${signal.result}`} signal={signal} />
      ))}
    </Card>
    </Animated.View>
  );
}
