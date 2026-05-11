import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useServerWake } from "@/hooks/useServerWake";

const WAKE_WINDOW_MS = 45000;

export function ServerWakeBanner() {
  const insets = useSafeAreaInsets();
  const { isWaking, elapsed } = useServerWake();
  const progress = useSharedValue(0);
  const visible = isWaking && elapsed > 5;

  useEffect(() => {
    if (!visible) {
      progress.value = 0;
      return;
    }
    progress.value = withTiming(1, { duration: WAKE_WINDOW_MS });
  }, [progress, visible]);

  const progressStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.value }]
  }));

  if (!visible) return null;

  return (
    <View pointerEvents="none" className="absolute left-4 right-4 z-50" style={{ bottom: insets.bottom + 104 }}>
      <View className="overflow-hidden rounded-web border border-risk-warn-border bg-background/95 shadow-lg">
        <View className="px-4 py-2.5">
          <Text className="text-center font-ui text-xs text-risk-warn-text">Backend warming up - up to 45s</Text>
        </View>
        <View className="h-1 overflow-hidden bg-border">
          <Animated.View className="h-full w-full origin-left bg-risk-warn-text" style={progressStyle} />
        </View>
      </View>
    </View>
  );
}
