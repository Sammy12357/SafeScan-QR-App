import { useMemo, useState, type ReactNode } from "react";
import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system/legacy";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import ConfettiCannon from "react-native-confetti-cannon";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import { Button } from "@/components/ui/Button";
import { theme } from "@/constants/theme";
import { api, type AnalyzeResult, type ScanHistoryItem } from "@/services/api";
import { useScanStore } from "@/stores/scanStore";

const verdictLabels: Record<AnalyzeResult["verdict"], string> = {
  safe: "SAFE",
  warn: "CAUTION",
  danger: "DANGEROUS"
};

const verdictColors: Record<AnalyzeResult["verdict"], string> = {
  safe: theme.colors.safe,
  warn: theme.colors.warn,
  danger: theme.colors.danger
};

const severityLabels = {
  low: "LOW",
  medium: "MEDIUM",
  high: "HIGH"
} as const;

const scoreRingSize = 86;
const scoreRingStroke = 10;
const scoreRingRadius = (scoreRingSize - scoreRingStroke) / 2;
const scoreRingCircumference = 2 * Math.PI * scoreRingRadius;

function historyItemToAnalyzeResult(item: ScanHistoryItem): AnalyzeResult {
  const verdict =
    item.verdict === "safe" || item.verdict === "warn" || item.verdict === "danger"
      ? item.verdict
      : item.riskScore >= 80
        ? "danger"
        : item.riskScore >= 40
          ? "warn"
          : "safe";

  return {
    scanId: item.scanId,
    url: item.url,
    riskScore: item.riskScore,
    verdict,
    verdictText: verdictLabels[verdict],
    signals: item.signals,
    analyzedAt: item.analyzedAt,
    overallRisk: verdict === "danger" ? "high" : verdict === "warn" ? "suspicious" : "safe",
    confidenceScore: item.riskScore,
    scannedAt: item.scannedAt,
    counted: undefined,
    scanCount: undefined,
    payloadType: undefined,
    source: "backend"
  };
}

function formatReport(result: AnalyzeResult) {
  const signals = result.signals.map((signal) => `- ${signal.label}: ${signal.severity}`).join("\n");
  return [
    "SafeScan QR Report",
    "",
    `URL: ${result.url}`,
    `Verdict: ${verdictLabels[result.verdict]}`,
    `Risk score: ${result.riskScore}/100`,
    `Analyzed: ${new Date(result.analyzedAt).toLocaleString()}`,
    "",
    "Signals:",
    signals || "- No risk signals returned"
  ].join("\n");
}

function extractFirstUrl(payload: string) {
  return payload.match(/https?:\/\/[^\s]+/i)?.[0] ?? "";
}

function normalizeDescriptor(value?: string) {
  return value?.replace(/[_-]+/g, " ").trim();
}

function getThreatSummary(result: AnalyzeResult) {
  return normalizeDescriptor(result.threatType) || result.verdictText || verdictLabels[result.verdict];
}

function getPayloadLabel(result: AnalyzeResult) {
  return normalizeDescriptor(result.payloadType) || (extractFirstUrl(result.url) ? "URL" : "Plain text");
}

function getExecutionCopy(result: AnalyzeResult) {
  const payloadLabel = getPayloadLabel(result).toLowerCase();
  const threatSummary = getThreatSummary(result).toLowerCase();

  if (payloadLabel.includes("plain") || threatSummary.includes("embedded url")) {
    return "Display the decoded text payload without launching a standard browser, wallet, or message flow.";
  }

  if (payloadLabel.includes("wallet") || threatSummary.includes("wallet")) {
    return "Open a wallet-related action only after you confirm the destination and requested permissions.";
  }

  if (extractFirstUrl(result.url)) {
    return "Open the decoded web destination in a browser after you choose to continue.";
  }

  return "Display the decoded QR payload so you can inspect it before taking action.";
}

function severityTone(severity: "low" | "medium" | "high") {
  if (severity === "high") return theme.colors.risk.danger;
  if (severity === "medium") return theme.colors.risk.warn;
  return theme.colors.risk.safe;
}

function severityRank(severity: "low" | "medium" | "high") {
  if (severity === "high") return 3;
  if (severity === "medium") return 2;
  return 1;
}

function ScoreRing({ score, color }: { score: number; color: string }) {
  const clamped = Math.max(0, Math.min(100, score));
  const offset = scoreRingCircumference - (clamped / 100) * scoreRingCircumference;

  return (
    <View className="items-center justify-center" style={{ width: scoreRingSize, height: scoreRingSize }}>
      <Svg width={scoreRingSize} height={scoreRingSize} viewBox={`0 0 ${scoreRingSize} ${scoreRingSize}`} style={{ position: "absolute" }}>
        <Circle
          cx={scoreRingSize / 2}
          cy={scoreRingSize / 2}
          r={scoreRingRadius}
          stroke={theme.colors.risk.card.gaugeTrack}
          strokeWidth={scoreRingStroke}
          fill="none"
        />
        <Circle
          cx={scoreRingSize / 2}
          cy={scoreRingSize / 2}
          r={scoreRingRadius}
          stroke={color}
          strokeWidth={scoreRingStroke}
          fill="none"
          strokeDasharray={scoreRingCircumference}
          strokeDashoffset={offset}
          strokeLinecap="butt"
          transform={`rotate(-90 ${scoreRingSize / 2} ${scoreRingSize / 2})`}
        />
      </Svg>
      <Text className="font-display text-2xl text-textPrimary">{Math.round(clamped)}</Text>
    </View>
  );
}

function ScoreBar({ label, score, color, detail }: { label: string; score: number; color: string; detail: string }) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between gap-3">
        <Text className="min-w-0 flex-1 font-display text-xs uppercase tracking-widest text-textSecondary" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
          {label}
        </Text>
        <Text className="font-mono text-xs text-textPrimary">{clamped}/100</Text>
      </View>
      <View className="h-2 overflow-hidden rounded-pill bg-surfaceElevated" style={{ marginLeft: 52, marginRight: 18 }}>
        <View style={{ width: `${clamped}%`, backgroundColor: color }} className="h-full rounded-pill" />
      </View>
      <Text className="mt-1 self-center px-3 text-center font-ui text-xs text-textSecondary" style={{ lineHeight: 22, maxWidth: "96%" }}>
        {detail}
      </Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="rounded-web border border-border bg-surface px-4 py-4">
      <Text className="font-display text-xs uppercase tracking-widest text-accent">{title}</Text>
      <View className="mt-4">{children}</View>
    </View>
  );
}

export default function ScanResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scanId = Array.isArray(id) ? id[0] : id;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const cachedResult = queryClient.getQueryData<AnalyzeResult>(["scan-result", scanId]);
  const localResult = useScanStore((state) => state.history.find((scan) => scan.scanId === scanId || scan.id === scanId));
  const [actionMessage, setActionMessage] = useState("");

  const historyQuery = useQuery({
    queryKey: ["scan-history-result", scanId],
    enabled: Boolean(scanId && !cachedResult && !localResult),
    queryFn: async () => {
      const history = await api.scan.history();
      const match = history.find((item) => item.scanId === scanId || item.id === scanId);
      if (!match) throw new Error("Scan result not found.");
      return historyItemToAnalyzeResult(match);
    }
  });

  const result = cachedResult ?? localResult ?? historyQuery.data;
  const reportText = useMemo(() => (result ? formatReport(result) : ""), [result]);

  const shareReport = async () => {
    if (!result) return;
    try {
      const safeName = result.scanId.replace(/[^a-z0-9_-]/gi, "-").slice(0, 48);
      const uri = `${FileSystem.cacheDirectory}safescan-${safeName}.txt`;
      await FileSystem.writeAsStringAsync(uri, reportText);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "text/plain", dialogTitle: "Share SafeScan report" });
        setActionMessage("Report ready to share.");
      } else {
        await Clipboard.setStringAsync(reportText);
        setActionMessage("Report copied.");
      }
    } catch {
      setActionMessage("Could not share report.");
    }
  };

  const reportScan = async () => {
    if (!result) return;
    try {
      await api.scan.report(result.scanId, "user_report");
      setActionMessage("Report sent.");
    } catch {
      try {
        await api.scan.report(result.url, "user_report");
        setActionMessage("Report sent.");
      } catch {
        setActionMessage("Could not send report.");
      }
    }
  };

  const copyUrl = async () => {
    if (!result) return;
    try {
      await Clipboard.setStringAsync(result.url);
      setActionMessage("Payload copied.");
    } catch {
      setActionMessage("Could not copy payload.");
    }
  };

  const continueSafely = async () => {
    if (!result) return;
    const destination = extractFirstUrl(result.url) || result.url;

    try {
      const canOpen = await Linking.canOpenURL(destination);
      if (!canOpen) {
        setActionMessage("No launchable URL found in this payload.");
        return;
      }
      await Linking.openURL(destination);
    } catch {
      setActionMessage("Could not open destination.");
    }
  };

  if (!result) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, alignItems: "center", justifyContent: "center", padding: 24 }}>
        {historyQuery.isPending ? <ActivityIndicator color={theme.colors.accent} /> : null}
        <Text style={{ color: historyQuery.error ? theme.colors.danger : theme.colors.textSecondary, marginTop: 12, textAlign: "center" }}>
          {historyQuery.error instanceof Error ? historyQuery.error.message : "Loading scan result..."}
        </Text>
        <View style={{ marginTop: 18 }}>
          <Button title="Back to Scanner" variant="secondary" onPress={() => router.replace("/(tabs)/scanner")} />
        </View>
      </View>
    );
  }

  const verdictColor = verdictColors[result.verdict];
  const threatSummary = getThreatSummary(result);
  const payloadLabel = getPayloadLabel(result);
  const sortedSignals = [...result.signals].sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
  const topSignal = sortedSignals.find((signal) => !signal.passed && signal.severity !== "low") ?? sortedSignals[0];
  const secondarySignals = sortedSignals.filter((signal) => signal !== topSignal);
  const ruleScore = result.ruleScore ?? result.riskScore;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {result.verdict === "safe" ? <ConfettiCannon count={70} origin={{ x: 180, y: -20 }} fadeOut autoStart /> : null}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: insets.top + 18,
          paddingBottom: Math.max(insets.bottom, 18) + 28,
          gap: 18
        }}
      >
        <View className="flex-row items-center gap-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to scanner"
            onPress={() => router.replace("/(tabs)/scanner")}
            className="h-11 w-11 items-center justify-center rounded-web border border-border bg-surface"
          >
            <Feather name="arrow-left" size={20} color={theme.colors.textPrimary} />
          </Pressable>
          <View className="min-w-0 flex-1">
            <Text className="font-display text-2xl text-textPrimary">Scan result</Text>
            <Text className="mt-1 font-ui text-xs text-textSecondary">{new Date(result.analyzedAt).toLocaleString()}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Share report"
            onPress={shareReport}
            className="h-11 w-11 items-center justify-center rounded-web border border-border bg-surface"
          >
            <Feather name="share-2" size={18} color={theme.colors.textPrimary} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Copy payload"
            onPress={copyUrl}
            className="h-11 w-11 items-center justify-center rounded-web border border-border bg-surface"
          >
            <Feather name="copy" size={18} color={theme.colors.textPrimary} />
          </Pressable>
        </View>

        <View className="items-center px-2">
          <Text className="font-display text-xs uppercase tracking-widest text-accent">Scan verdict</Text>
          <Text
            className="mt-3 w-full font-displayBlack uppercase"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.5}
            style={{ color: verdictColor, fontSize: 46, lineHeight: 54, textAlign: "center" }}
          >
            {verdictLabels[result.verdict]}
          </Text>
          <View className="mt-5">
            <ScoreRing score={result.riskScore} color={verdictColor} />
          </View>
          <Text className="mt-5 text-center font-ui text-sm leading-6 text-textSecondary">{result.verdictText ?? verdictLabels[result.verdict]}</Text>
          <Text
            className="mt-4 w-full text-center font-display text-sm text-accent"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
          >
            Threat type: {threatSummary}
          </Text>
        </View>

        <Section title="What this QR executes">
          <Text className="font-ui text-sm leading-6 text-textPrimary">{getExecutionCopy(result)}</Text>
        </Section>

        <Section title="Decoded URL / Payload">
          <Text className="font-mono text-sm leading-6 text-textPrimary">{result.url}</Text>
        </Section>

        <Section title="Final risk score">
          <View className="flex-row items-center justify-between gap-3">
            <Text className="font-display text-xl text-textPrimary">{Math.round(result.riskScore)} / 100</Text>
            <View className="rounded-pill px-4 py-2" style={{ backgroundColor: `${verdictColor}24` }}>
              <Text className="font-display text-xs uppercase tracking-widest" style={{ color: verdictColor }}>
                {verdictLabels[result.verdict]}
              </Text>
            </View>
          </View>

          {topSignal ? (
            <View className="mt-5 rounded-web border px-4 py-4" style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.risk.card.bg }}>
              <View className="flex-row items-start justify-between gap-3">
                <View className="min-w-0 flex-1">
                  <Text className="font-display text-sm text-textPrimary" numberOfLines={2}>
                    {topSignal.label}
                  </Text>
                  <Text className="mt-4 font-ui text-sm text-textSecondary" style={{ lineHeight: 26 }}>
                    {topSignal.description || topSignal.result}
                  </Text>
                </View>
                <View
                  className="rounded-pill border px-3 py-1"
                  style={{
                    borderColor: severityTone(topSignal.severity).border,
                    backgroundColor: severityTone(topSignal.severity).bg
                  }}
                >
                  <Text className="font-display text-xs uppercase" style={{ color: severityTone(topSignal.severity).text }}>
                    ! {severityLabels[topSignal.severity]}
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <Text className="mt-4 font-ui text-sm text-textSecondary">No risk signals returned.</Text>
          )}

          <View className="mt-8 gap-6 px-2">
            <View className="items-start gap-3">
              <Text className="font-display text-xs uppercase tracking-widest text-accent">Security engine</Text>
              <View className="self-start rounded-pill border border-border bg-surfaceElevated px-3 py-1">
                <Text className="font-mono text-[10px] text-accent">rules + signals</Text>
              </View>
              <Text className="font-ui text-sm text-textPrimary" style={{ lineHeight: 24 }}>
                Transparent QR checks decide this score. The weak backend ML score is no longer shown or used as the primary verdict.
              </Text>
            </View>
            <ScoreBar
              label="URL safety checks"
              score={ruleScore}
              color={ruleScore >= 75 ? theme.colors.danger : ruleScore >= 35 ? theme.colors.warn : theme.colors.safe}
              detail="Checks look for spoofed brands, executable payloads, wallet-drain language, injection strings, weak transport, shorteners, and suspicious URL shape."
            />
            <ScoreBar
              label="Final score"
              score={result.riskScore}
              color={verdictColor}
              detail="Generic backend warnings are reduced for trusted domains unless concrete malicious indicators are present."
            />
          </View>
        </Section>

        <View className="gap-3 rounded-web border border-border bg-surface px-4 py-4">
          <Text className="font-display text-xs uppercase tracking-widest text-accent">Signal breakdown</Text>
          <View className="self-start rounded-pill border border-border bg-surfaceElevated px-3 py-1">
            <Text className="font-display text-xs uppercase tracking-widest text-textSecondary">Type - {payloadLabel}</Text>
          </View>

          {secondarySignals.length ? (
            secondarySignals.map((signal) => {
              const tone = severityTone(signal.severity);
              return (
                <View key={`${signal.label}-${signal.severity}-${signal.result}`} className="flex-row items-start gap-3 border-t border-border pt-3">
                  <View className="mt-1.5 h-2.5 w-2.5 rounded-pill" style={{ backgroundColor: tone.text }} />
                  <View className="min-w-0 flex-1">
                    <Text className="font-ui text-sm text-textPrimary">{signal.label}</Text>
                    <Text className="mt-1 font-ui text-xs leading-5 text-textSecondary">{signal.result}</Text>
                  </View>
                  <Text className="font-display text-xs uppercase" style={{ color: tone.text }}>
                    {severityLabels[signal.severity]}
                  </Text>
                </View>
              );
            })
          ) : (
            <Text className="border-t border-border pt-3 font-ui text-sm text-textSecondary">
              {topSignal ? "Primary signal shown above." : "No risk signals returned."}
            </Text>
          )}
        </View>

        {actionMessage ? <Text className="text-center font-ui text-sm text-safe">{actionMessage}</Text> : null}

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Button title="Back" variant="secondary" onPress={() => router.replace("/(tabs)/scanner")} />
          </View>
          <View className="flex-1">
            <Button title="Block & Report" variant="danger" onPress={reportScan} />
          </View>
        </View>
        <Button title="Continue Safely" variant="primary" onPress={continueSafely} />
      </ScrollView>
    </View>
  );
}
