import { useEffect } from "react";
import { Text } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/constants/theme";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const { isOnline } = useNetworkStatus();
  const translateY = useSharedValue(-140);

  useEffect(() => {
    translateY.value = withSpring(isOnline ? -140 : 0, {
      damping: 18,
      stiffness: 180
    });
  }, [isOnline, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }]
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 60,
          paddingTop: insets.top + 10,
          paddingHorizontal: 16,
          paddingBottom: 12,
          backgroundColor: theme.colors.danger,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.danger
        },
        animatedStyle
      ]}
    >
      <Text style={{ color: theme.colors.primaryButtonText, textAlign: "center", fontFamily: theme.fonts.sansSemiBold, fontSize: 14 }}>No internet connection</Text>
    </Animated.View>
  );
}
