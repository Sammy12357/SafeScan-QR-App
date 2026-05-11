import { useCallback, useEffect, useMemo } from "react";
import { FlashList } from "@shopify/flash-list";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { useFocusEffect, useRouter } from "expo-router";
import { RefreshControl, Text, View, Pressable } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/constants/theme";
import { api, type AnalyzeResult, type ScanHistoryItem } from "@/services/api";
import { useAuthStore } from "@/stores/authStore";
import { useScanStore, type ScanRecord } from "@/stores/scanStore";
import { truncateMiddle } from "@/utils/url";

const verdictStyles: Record<string, { badge: string; text: string; label: string }> = {
  safe: { badge: "border-risk-safe-border bg-risk-safe-bg", text: "text-risk-safe-text", label: "SAFE" },
  warn: { badge: "border-risk-warn-border bg-risk-warn-bg", text: "text-risk-warn-text", label: "WARN" },
  danger: { badge: "border-risk-danger-border bg-risk-danger-bg", text: "text-risk-danger-text", label: "DANGER" }
};

type HistoryEntry = {
  scanId: string;
  url: string;
  riskScore: number;
  verdict: AnalyzeResult["verdict"];
  verdictText?: string;
  signals: AnalyzeResult["signals"];
  analyzedAt: string;
  scannedAt: string;
  source: AnalyzeResult["source"];
};

function normalizeVerdict(verdict: string | undefined, riskScore: number): AnalyzeResult["verdict"] {
  if (verdict === "safe" || verdict === "warn" || verdict === "danger") return verdict;
  if (riskScore >= 80) return "danger";
  if (riskScore >= 40) return "warn";
  return "safe";
}

function historyItemToEntry(item: ScanHistoryItem): HistoryEntry {
  const verdict = normalizeVerdict(item.verdict, item.riskScore);

  return {
    scanId: item.scanId,
    url: item.url,
    riskScore: item.riskScore,
    verdict,
    verdictText: verdictStyles[verdict].label,
    signals: item.signals,
    analyzedAt: item.analyzedAt,
    scannedAt: item.scannedAt,
    source: "backend"
  };
}

function scanRecordToEntry(scan: ScanRecord): HistoryEntry {
  return {
    scanId: scan.scanId,
    url: scan.url,
    riskScore: scan.riskScore,
    verdict: scan.verdict,
    verdictText: scan.verdictText,
    signals: scan.signals,
    analyzedAt: scan.analyzedAt,
    scannedAt: scan.scannedAt,
    source: scan.source
  };
}

function historyEntryToAnalyzeResult(item: HistoryEntry): AnalyzeResult {
  return {
    scanId: item.scanId,
    url: item.url,
    riskScore: item.riskScore,
    verdict: item.verdict,
    verdictText: item.verdictText ?? verdictStyles[item.verdict].label,
    signals: item.signals,
    analyzedAt: item.analyzedAt,
    overallRisk: item.verdict === "danger" ? "high" : item.verdict === "warn" ? "suspicious" : "safe",
    confidenceScore: item.riskScore,
    scannedAt: item.scannedAt,
    counted: undefined,
    scanCount: undefined,
    payloadType: undefined,
    source: item.source
  };
}

function isHiddenHistoryError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return /SafeScan API (?:0|401)|EXPO_PUBLIC_API_BASE_URL|Authentication required|Missing refresh token/i.test(error.message);
}

function SkeletonRow() {
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    opacity.value = withRepeat(withSequence(withTiming(1, { duration: 700 }), withTiming(0.35, { duration: 700 })), -1, true);
  }, [opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={style} className="rounded-web border border-border bg-surface p-4">
      <View className="h-4 w-3/4 rounded-pill bg-border" />
      <View className="mt-4 flex-row items-center justify-between">
        <View className="h-7 w-20 rounded-pill bg-border" />
        <View className="h-4 w-24 rounded-pill bg-border" />
      </View>
    </Animated.View>
  );
}

function VerdictBadge({ verdict }: { verdict: string }) {
  const styles = verdictStyles[verdict] ?? verdictStyles.warn;

  return (
    <View className={`rounded-web border px-3 py-2 ${styles.badge}`}>
      <Text className={`font-display text-xs uppercase tracking-widest ${styles.text}`}>{styles.label}</Text>
    </View>
  );
}

export default function AnalyzeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const localHistory = useScanStore((state) => state.history);
  const apiSessionVersion = useAuthStore((state) => state.apiSessionVersion);
  const hasBackendSession = useAuthStore((state) => state.hasBackendSession);
  // Including apiSessionVersion in the queryKey means React Query treats this
  // as a fresh query whenever a new backend access token is seeded — that's
  // how we recover from sign-in races where the first fetch fired before the
  // token landed.
  const historyQuery = useQuery({
    queryKey: ["scan", "history", apiSessionVersion],
    queryFn: () => api.scan.history(),
    enabled: hasBackendSession
  });

  const historyEntries = useMemo(() => {
    const remoteEntries = (historyQuery.data ?? []).map(historyItemToEntry);
    const seenScanIds = new Set(remoteEntries.map((item) => item.scanId));
    const localEntries = localHistory.map(scanRecordToEntry).filter((item) => !seenScanIds.has(item.scanId));

    return [...localEntries, ...remoteEntries].sort(
      (left, right) => new Date(right.analyzedAt).getTime() - new Date(left.analyzedAt).getTime()
    );
  }, [historyQuery.data, localHistory]);

  useFocusEffect(
    useCallback(() => {
      if (hasBackendSession) {
        void historyQuery.refetch();
      }
    }, [hasBackendSession, historyQuery.refetch])
  );

  const openResult = (item: HistoryEntry) => {
    const result = historyEntryToAnalyzeResult(item);
    queryClient.setQueryData(["scan-result", result.scanId], result);
    router.push({ pathname: "/scan-result/[id]", params: { id: result.scanId } });
  };

  const renderItem = ({ item }: { item: HistoryEntry }) => {
    const result = historyEntryToAnalyzeResult(item);
    const relativeTime = formatDistanceToNow(new Date(result.analyzedAt), { addSuffix: true });

    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => openResult(item)}
        className="mb-3 rounded-web border border-border bg-surface px-4 py-4"
      >
        <View className="flex-row items-center justify-between gap-4">
          <View className="min-w-0 flex-1">
            <Text className="font-display text-xs uppercase tracking-widest text-accent">Payload</Text>
            <Text className="mt-2 font-mono text-sm leading-5 text-textPrimary" numberOfLines={2}>
              {truncateMiddle(result.url, 64)}
            </Text>
          </View>
          <View className="items-center justify-center self-stretch">
            <VerdictBadge verdict={result.verdict} />
          </View>
        </View>

        <View className="mt-4 flex-row items-center justify-between border-t border-border pt-3">
          <View>
            <Text className="font-display text-xs uppercase tracking-widest text-textSecondary">Risk score</Text>
            <Text className="mt-1 font-display text-xl text-textPrimary">{result.riskScore}/100</Text>
          </View>
          <Text className="max-w-[48%] text-right font-ui text-sm text-textSecondary" numberOfLines={1}>
            {relativeTime}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingTop: insets.top + 28 }}>
      <View className="px-4 pb-5">
        <Text className="font-display text-xs uppercase tracking-widest text-accent">SafeScan QR</Text>
        <Text className="mt-2 font-display text-3xl text-textPrimary">Scan History</Text>
      </View>

      {historyQuery.isPending && historyEntries.length === 0 ? (
        <View className="gap-3 px-4">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </View>
      ) : (
        <FlashList
          data={historyEntries}
          renderItem={renderItem}
          keyExtractor={(item) => item.scanId}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 20) + 28 }}
          refreshControl={<RefreshControl refreshing={historyQuery.isFetching && !historyQuery.isPending} onRefresh={() => historyQuery.refetch()} tintColor={theme.colors.accent} />}
          ListEmptyComponent={
            <View style={{ minHeight: 420 }} className="items-center justify-center px-6">
              <Text className="text-center font-display text-xl text-textPrimary">No scans yet.</Text>
              <Text className="mt-2 text-center font-ui text-base text-textSecondary">Scan your first QR code.</Text>
            </View>
          }
        />
      )}

      {historyQuery.error && historyEntries.length === 0 && !isHiddenHistoryError(historyQuery.error) ? (
        <Text className="px-4 pt-4 text-center font-ui text-danger">
          {historyQuery.error instanceof Error ? historyQuery.error.message : "Could not load scan history."}
        </Text>
      ) : null}
    </View>
  );
}
