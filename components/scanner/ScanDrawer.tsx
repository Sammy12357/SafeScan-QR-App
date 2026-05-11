import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, ScrollView, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/Button";
import { RiskBreakdownPanel } from "@/components/risk/RiskBreakdownPanel";
import { LoadingSteps } from "@/components/shared/LoadingSteps";
import { theme } from "@/constants/theme";
import { useAnalyze } from "@/hooks/useAnalyze";
import { reportUrl } from "@/services/api";
import { useScanStore } from "@/stores/scanStore";
import { shareScanReport } from "@/utils/sharing";
import { truncateMiddle } from "@/utils/url";

export function ScanDrawer({ payload, onClear }: { payload: string | null; onClear: () => void }) {
  const analyze = useAnalyze();
  const addScan = useScanStore((state) => state.addScan);
  const insets = useSafeAreaInsets();
  const [reported, setReported] = useState(false);
  const reveal = useSharedValue(28);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!payload) {
      reveal.value = 28;
      opacity.value = 0;
      return;
    }
    reveal.value = withTiming(0, { duration: 320 });
    opacity.value = withTiming(1, { duration: 320 });
  }, [opacity, payload, reveal]);

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: reveal.value }]
  }));

  if (!payload) return null;

  const result = analyze.data;

  const runAnalysis = () => {
    setReported(false);
    analyze.mutate(payload, {
      onSuccess: (scan) => {
        addScan({ ...scan, id: `${Date.now()}` });
      }
    });
  };

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 20,
          elevation: 20,
          backgroundColor: theme.colors.background,
          borderColor: theme.colors.border,
          borderWidth: 1,
          paddingHorizontal: 16,
          paddingTop: insets.top + 18,
          paddingBottom: Math.max(insets.bottom, 16) + 16,
          gap: 12
        },
        sheetStyle
      ]}
    >
      <ScrollView contentContainerStyle={{ gap: 12 }} showsVerticalScrollIndicator={false}>
        <Text style={{ color: theme.colors.accent, fontSize: 11, fontWeight: "900", letterSpacing: 1.5 }}>DECODED PAYLOAD</Text>
        <Text style={{ color: theme.colors.textPrimary, fontSize: 20, fontWeight: "900" }}>QR decoded</Text>
        <Text style={{ color: theme.colors.textSecondary, lineHeight: 20 }}>{truncateMiddle(payload, 92)}</Text>

        <LoadingSteps active={analyze.isPending} />
        {analyze.isPending ? <ActivityIndicator color={theme.colors.accent} /> : null}

        {!result ? (
          <View style={{ gap: 10 }}>
            <Button title="Analyze Risk" onPress={runAnalysis} disabled={analyze.isPending} />
            <Button title="Scan Another" variant="secondary" onPress={onClear} />
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            <RiskBreakdownPanel result={result} />
            {reported ? <Text style={{ color: theme.colors.safe }}>Report queued. SafeScan will use it to improve detection.</Text> : null}
            <Button
              title="Block & Report"
              variant={result.overallRisk === "high" ? "primary" : "secondary"}
              onPress={async () => {
                await reportUrl(result.url, "Mobile user blocked risky QR");
                setReported(true);
              }}
            />
            <Button title="Share Report" variant="secondary" onPress={() => shareScanReport(result)} />
            <Button title="Continue Safely" variant="ghost" onPress={() => Linking.openURL(result.url)} />
            <Button title="Scan Another" variant="secondary" onPress={onClear} />
          </View>
        )}
      </ScrollView>
    </Animated.View>
  );
}
