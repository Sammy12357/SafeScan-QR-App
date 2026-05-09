import { useEffect } from "react";
import { Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { theme } from "@/constants/theme";

type Verdict = "safe" | "warn" | "danger";

const verdictColors: Record<Verdict, string> = {
  safe: theme.colors.safe,
  warn: theme.colors.warn,
  danger: theme.colors.danger
};

function polarToCartesian(cx: number, cy: number, radius: number, angle: number) {
  const radians = ((angle - 180) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians)
  };
}

function arcPath(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 0 ${end.x} ${end.y}`;
}

export function RiskGauge({ score, verdict }: { score: number; verdict: Verdict }) {
  const clampedScore = Math.max(0, Math.min(100, score));
  const needle = useSharedValue(0);
  const color = verdictColors[verdict];

  useEffect(() => {
    needle.value = withTiming(clampedScore, { duration: 600 });
  }, [clampedScore, needle]);

  const needleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-90 + needle.value * 1.8}deg` }]
  }));

  return (
    <View className="items-center justify-center">
      <View className="h-44 w-72 items-center justify-center">
        <Svg width={272} height={150} viewBox="0 0 272 150">
          <Path d={arcPath(136, 136, 104, 0, 180)} stroke={theme.colors.risk.card.gaugeTrack} strokeWidth={18} fill="none" strokeLinecap="round" />
          <Path d={arcPath(136, 136, 104, 0, 180)} stroke={color} strokeWidth={18} fill="none" strokeLinecap="round" />
        </Svg>
        <Animated.View className="absolute bottom-8 h-24 w-1 origin-bottom rounded-pill" style={[{ backgroundColor: color }, needleStyle]} />
        <View className="absolute bottom-6 h-4 w-4 rounded-pill" style={{ backgroundColor: color }} />
        <View className="absolute bottom-8 items-center">
          <Text className="font-mono text-5xl text-textPrimary">{Math.round(clampedScore)}</Text>
          <Text className="font-semibold text-xs uppercase tracking-widest text-textSecondary">risk score</Text>
        </View>
      </View>
    </View>
  );
}
