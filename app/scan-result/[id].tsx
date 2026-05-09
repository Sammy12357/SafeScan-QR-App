import { useMemo, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system/legacy";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import ConfettiCannon from "react-native-confetti-cannon";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RiskGauge } from "@/components/RiskGauge";
import { SignalRow } from "@/components/SignalRow";
import { Button } from "@/components/ui/Button";
import { theme } from "@/constants/theme";
import { api, type AnalyzeResult, type ScanHistoryItem } from "@/services/api";
import { useScanStore } from "@/stores/scanStore";
import { truncateMiddle } from "@/utils/url";

const verdictLabels: Record<AnalyzeResult["verdict"], string> = {
  safe: "SAFE",
  warn: "SUSPICIOUS",
  danger: "DANGEROUS"
};

const verdictColors: Record<AnalyzeResult["verdict"], string> = {
  safe: theme.colors.safe,
  warn: theme.colors.warn,
  danger: theme.colors.danger
};

function historyItemToAnalyzeResult(item: ScanHistoryItem): AnalyzeResult {
  const verdict = item.verdict === "safe" || item.verdict === "warn" || item.verdict === "danger"
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
      setActionMessage("URL copied.");
    } catch {
      setActionMessage("Could not copy URL.");
    }
  };

  if (!result) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, alignItems: "center", justifyContent: "center", padding: 24 }}>
        {historyQuery.isPending ? <ActivityIndicator color={theme.colors.accent} /> : null}
        <Text style={{ color: historyQuery.error ? theme.colors.danger : theme.colors.textSecondary, marginTop: 12, textAlign: "center" }}>
          {historyQuery.error instanceof Error ? historyQuery.error.message : "Loading scan result…"}
        </Text>
        <View style={{ marginTop: 18 }}>
          <Button title="Back to Scanner" variant="secondary" onPress={() => router.replace("/(tabs)/scanner")} />
        </View>
      </View>
    );
  }

  const verdictColor = verdictColors[result.verdict];

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {result.verdict === "safe" ? <ConfettiCannon count={70} origin={{ x: 180, y: -20 }} fadeOut autoStart /> : null}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: insets.top + 18,
          paddingBottom: Math.max(insets.bottom, 18) + 28,
          gap: 20
        }}
      >
        <View className="flex-row items-center gap-3">
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace("/(tabs)/scanner")}
            className="h-11 w-11 items-center justify-center rounded-web border border-border bg-surface"
          >
            <Feather name="arrow-left" size={20} color={theme.colors.textPrimary} />
          </Pressable>
          <View className="flex-1">
            <Text className="font-semibold text-xs uppercase tracking-widest text-accent">Scan result</Text>
            <Text className="font-mono text-sm text-textPrimary" numberOfLines={1}>
              {truncateMiddle(result.url, 54)}
            </Text>
            <Text className="mt-1 font-ui text-xs text-textSecondary">{new Date(result.analyzedAt).toLocaleString()}</Text>
          </View>
        </View>

        <View className="items-center rounded-web border border-border bg-surfaceElevated px-4 py-6">
          <RiskGauge score={result.riskScore} verdict={result.verdict} />
          <Text style={{ color: verdictColor }} className="mt-2 font-display text-4xl">
            {verdictLabels[result.verdict]}
          </Text>
          <Text className="mt-3 text-center font-ui text-base leading-6 text-textSecondary">
            {result.verdictText ?? verdictLabels[result.verdict]}
          </Text>
          {result.mlRisk?.enabled ? (
            <View className="mt-4 rounded-web border border-border bg-surface px-4 py-3">
              <Text className="text-center font-semibold text-xs uppercase tracking-widest text-accent">ML risk distribution</Text>
              <Text className="mt-2 text-center font-mono text-sm text-textPrimary">
                {result.mlRisk.score ?? result.riskScore}/100 risk · {Math.round((result.mlRisk.maliciousProbability ?? 0) * 100)}% malicious
              </Text>
            </View>
          ) : null}
        </View>

        <View className="gap-3">
          <Text className="font-semibold text-xs uppercase tracking-widest text-accent">Signal breakdown</Text>
          {result.signals.length ? (
            result.signals.map((signal) => <SignalRow key={`${signal.label}-${signal.severity}-${signal.result}`} label={signal.label} result={signal.result} severity={signal.severity} />)
          ) : (
            <Text className="rounded-web border border-border bg-surface px-4 py-3 font-ui text-textSecondary">No risk signals returned.</Text>
          )}
        </View>

        {actionMessage ? <Text className="text-center font-ui text-sm text-safe">{actionMessage}</Text> : null}

        <View className="flex-row gap-2">
          <View className="flex-1">
            <Button title="Share" variant="secondary" onPress={shareReport} />
          </View>
          <View className="flex-1">
            <Button title="Report" variant="danger" onPress={reportScan} />
          </View>
          <View className="flex-1">
            <Button title="Copy URL" variant="secondary" onPress={copyUrl} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
