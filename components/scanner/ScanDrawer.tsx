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
import { canOpenScannedUrl } from "@/utils/verdictCopy";

export function ScanDrawer({ payload, onClear }: { payload: string | null; onClear: () => void }) {
  const analyze = useAnalyze();
  const addScan = useScanStore((state) => state.addScan);
  const insets = useSafeAreaInsets();
  const [reported, setReported] = useState(false);
  const [analyzedPayload, setAnalyzedPayload] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState("");
  const reveal = useSharedValue(28);
  const opacity = useSharedValue(0);

  useEffect(() => {
    setAnalyzedPayload(null);
    setActionMessage("");
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

  // React Query retains the last mutation result while a new QR is framed.
  // Never attach a previous payload's verdict to the current one.
  const result = !analyze.isPending && !analyze.isError && analyzedPayload === payload && analyze.data &&
    (analyze.data.rawPayload === payload || analyze.data.url === payload) ? analyze.data : null;

  const runAnalysis = () => {
    setReported(false);
    setActionMessage("");
    analyze.mutate(payload, {
      onSuccess: (scan) => {
        setAnalyzedPayload(payload);
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
        {analyze.error ? (
          <Text style={{ color: theme.colors.danger, lineHeight: 20 }}>
            SafeScan could not verify this QR. {analyze.error instanceof Error ? analyze.error.message : "Please try again."}
          </Text>
        ) : null}

        {!result ? (
          <View style={{ gap: 10 }}>
            <Button title="Analyze Risk" onPress={runAnalysis} disabled={analyze.isPending} />
            <Button title="Scan Another" variant="secondary" onPress={onClear} />
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            <RiskBreakdownPanel result={result} />
            {reported ? <Text style={{ color: theme.colors.safe }}>Report sent.</Text> : null}
            <Button
              title="Block & Report"
              variant={result.overallRisk === "high" ? "primary" : "secondary"}
              onPress={async () => {
                try {
                  await reportUrl(result.url, "Mobile user blocked risky QR");
                  setReported(true);
                  setActionMessage("");
                } catch {
                  setReported(false);
                  setActionMessage("Could not send the report. Please try again.");
                }
              }}
            />
            <Button title="Share Report" variant="secondary" onPress={() => shareScanReport(result)} />
            {canOpenScannedUrl(result) ? (
              <Button title="Open destination" variant="ghost" onPress={async () => {
                if (!canOpenScannedUrl(result)) {
                  setActionMessage("The verdict needs fresh review before this link can open.");
                  return;
                }
                try {
                  if (!(await Linking.canOpenURL(result.url))) {
                    setActionMessage("This link cannot be opened on this device.");
                    return;
                  }
                  if (!canOpenScannedUrl(result)) {
                    setActionMessage("The verdict needs fresh review before this link can open.");
                    return;
                  }
                  await Linking.openURL(result.url);
                } catch {
                  setActionMessage("Could not open this destination.");
                }
              }} />
            ) : null}
            {actionMessage ? <Text style={{ color: theme.colors.textSecondary }}>{actionMessage}</Text> : null}
            <Button title="Scan Another" variant="secondary" onPress={onClear} />
          </View>
        )}
      </ScrollView>
    </Animated.View>
  );
}
