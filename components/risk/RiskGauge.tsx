import { useEffect } from "react";
import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, { useAnimatedProps, useSharedValue, withTiming } from "react-native-reanimated";
import { colors, fonts, theme, typography } from "@/constants/theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const SIZE = 112;
const CENTER = SIZE / 2;
const RADIUS = 46;
const STROKE_WIDTH = 10;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type RiskTone = "safe" | "warn" | "danger";

function scoreTone(score: number): RiskTone {
  if (score > 70) return "danger";
  if (score > 40) return "warn";
  return "safe";
}

function scoreLabel(score: number) {
  if (score > 70) return "DANGEROUS";
  if (score > 40) return "CAUTION";
  return "SAFE";
}

export function RiskGauge({ score, verdict }: { score: number; verdict?: string }) {
  const strokeDashoffset = useSharedValue(CIRCUMFERENCE);
  const tone = scoreTone(score);
  const riskColors = colors.risk[tone];

  useEffect(() => {
    strokeDashoffset.value = withTiming(CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE, { duration: 1000 });
  }, [score, strokeDashoffset]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: strokeDashoffset.value
  }));

  return (
    <View
      accessibilityLabel={`Risk score: ${score} out of 100. Verdict: ${verdict ?? scoreLabel(score)}`}
      className="items-center"
    >
      <View
        className="items-center justify-center rounded-pill"
        style={{
          width: SIZE,
          height: SIZE,
          shadowColor: riskColors.indicatorBg,
          shadowOpacity: 0.24,
          shadowRadius: 46,
          elevation: 6
        }}
      >
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ position: "absolute" }}>
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            stroke={colors.risk.card.gaugeTrack}
            strokeWidth={STROKE_WIDTH}
            fill={colors.risk.card.gaugeInnerBg}
          />
          <AnimatedCircle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            stroke={riskColors.text}
            strokeWidth={STROKE_WIDTH}
            fill="none"
            strokeDasharray={CIRCUMFERENCE}
            animatedProps={animatedProps}
            strokeLinecap="round"
            transform={`rotate(-90 ${CENTER} ${CENTER})`}
          />
        </Svg>
        <Text style={{ fontSize: theme.fontSizes.scoreGauge, fontFamily: fonts.sansSemiBold, color: riskColors.text }}>
          {score}
        </Text>
      </View>
      <Text style={{ ...typography.h3, color: riskColors.text, marginTop: 12 }}>
        {verdict ?? scoreLabel(score)}
      </Text>
      <Text style={{ ...typography.label, color: colors.textMuted, marginTop: 4 }}>Risk Score</Text>
    </View>
  );
}
