import { useMemo } from "react";
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { config } from "@/constants/config";
import { theme } from "@/constants/theme";
import { useScanStore } from "@/stores/scanStore";
import { truncateMiddle } from "@/utils/url";

type LeaderboardEntry = {
  rank: number;
  name: string;
  scans: number;
  tier?: string;
  isCurrentUser?: boolean;
};

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripTags(value: string) {
  return decodeHtml(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function parseLeaderboardRows(html: string): LeaderboardEntry[] {
  const rows = html.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];

  return rows.reduce<LeaderboardEntry[]>((entries, row) => {
    const cells = row.match(/<td[\s\S]*?<\/td>/gi) ?? [];
    if (cells.length < 3 || !cells[0] || !cells[1] || !cells[2]) return entries;
    const rankText = stripTags(cells[0]);
    const nameText = stripTags(cells[1]).replace(/\s+\(you\)$/i, "");
    const scanText = stripTags(cells[2]);
    const rank = Number(rankText.replace(/[^0-9]/g, ""));
    const scans = Number(scanText.replace(/[^0-9]/g, ""));

    if (!rank || !nameText) return entries;
    entries.push({
      rank,
      name: nameText,
      scans: Number.isFinite(scans) ? scans : 0,
      tier: cells[3] ? stripTags(cells[3]) : undefined,
      isCurrentUser: /current-user|lb-username-you/i.test(row)
    });
    return entries;
  }, []);
}

async function fetchLeaderboard() {
  const response = await fetch(`${config.apiBaseUrl}/leaderboard`);
  const html = await response.text();
  if (!response.ok) throw new Error(`Leaderboard unavailable (${response.status}).`);
  return parseLeaderboardRows(html);
}

function LeaderRow({ item }: { item: LeaderboardEntry }) {
  const rankColor = item.rank <= 3 ? theme.colors.accent : theme.colors.textSecondary;

  return (
    <View
      className="flex-row items-center gap-3 border-b border-border px-1 py-4"
      style={{ backgroundColor: item.isCurrentUser ? theme.colors.primaryDim : "transparent" }}
    >
      <View className="h-10 w-10 items-center justify-center rounded-web border border-border bg-surfaceElevated">
        <Text className="font-display text-sm" style={{ color: rankColor }}>
          {item.rank}
        </Text>
      </View>
      <View className="min-w-0 flex-1">
        <Text className="font-display text-base text-textPrimary" numberOfLines={1}>
          {item.name}
        </Text>
        <Text className="mt-1 font-ui text-xs text-textSecondary">{item.tier ?? "SafeScan member"}</Text>
      </View>
      <View className="items-end">
        <Text className="font-display text-lg text-textPrimary">{item.scans}</Text>
        <Text className="font-ui text-xs text-textSecondary">scans</Text>
      </View>
    </View>
  );
}

export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const localHistory = useScanStore((state) => state.history);
  const leaderboardQuery = useQuery({
    queryKey: ["website-leaderboard"],
    queryFn: fetchLeaderboard,
    staleTime: 60_000
  });

  const localFallback = useMemo<LeaderboardEntry[]>(
    () =>
      localHistory.length
        ? [
            {
              rank: 1,
              name: "This device",
              scans: localHistory.length,
              tier: `Latest: ${truncateMiddle(localHistory[0]?.url ?? "Scan", 28)}`,
              isCurrentUser: true
            }
          ]
        : [],
    [localHistory]
  );
  const entries = leaderboardQuery.data?.length ? leaderboardQuery.data : localFallback;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: insets.top + 28, paddingBottom: Math.max(insets.bottom, 20) + 36 }}
      data={entries}
      keyExtractor={(item) => `${item.rank}-${item.name}`}
      renderItem={({ item }) => <LeaderRow item={item} />}
      refreshControl={<RefreshControl tintColor={theme.colors.accent} refreshing={leaderboardQuery.isRefetching} onRefresh={() => leaderboardQuery.refetch()} />}
      ListHeaderComponent={
        <View className="mb-5 gap-3">
          <Text className="font-display text-xs uppercase tracking-widest text-accent">SafeScan QR</Text>
          <Text className="font-display text-3xl text-textPrimary">Global Leaderboard</Text>
          <Text className="font-ui text-sm leading-6 text-textSecondary">
            Ranked by unique QR scans from the SafeScan website. Pull down to refresh the latest board.
          </Text>
          {leaderboardQuery.isLoading ? <ActivityIndicator color={theme.colors.accent} /> : null}
          {leaderboardQuery.error ? (
            <Text className="rounded-web border border-risk-warn-border bg-risk-warn-bg p-3 font-ui text-risk-warn-text">
              {leaderboardQuery.error instanceof Error ? leaderboardQuery.error.message : "Could not load leaderboard."}
            </Text>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        <View className="rounded-web border border-border bg-surface p-5">
          <Text className="font-display text-lg text-textPrimary">No scans yet.</Text>
          <Text className="mt-2 font-ui text-sm leading-6 text-textSecondary">
            The website leaderboard is empty right now. Start scanning and check back after the backend records activity.
          </Text>
        </View>
      }
    />
  );
}
