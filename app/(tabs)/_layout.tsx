import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useEffect } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/constants/theme";

type TabIconName = "camera" | "search" | "gift" | "user";

function TabIcon({ name, color, focused }: { name: TabIconName; color: string; focused: boolean }) {
  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(focused ? 1 : 0, { duration: 180 });
  }, [focused, progress]);

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scaleX: progress.value }]
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -progress.value }]
  }));

  return (
    <View style={{ width: 42, alignItems: "center" }}>
      <Animated.View style={iconStyle}>
        <Feather name={name} color={color} size={20} />
      </Animated.View>
      <Animated.View
        style={[
          {
            width: 22,
            height: 2,
            borderRadius: 999,
            backgroundColor: theme.colors.tab.active,
            marginTop: 5
          },
          indicatorStyle
        ]}
      />
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 14);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: theme.colors.tab.bg, elevation: 0, shadowOpacity: 0 },
        headerTintColor: theme.colors.textPrimary,
        tabBarStyle: {
          backgroundColor: theme.colors.tab.bg,
          borderTopWidth: 1,
          borderTopColor: theme.colors.tab.border,
          height: 64 + bottomInset,
          paddingBottom: bottomInset,
          paddingTop: 10,
          elevation: 0,
          shadowOpacity: 0
        },
        tabBarActiveTintColor: theme.colors.tab.active,
        tabBarInactiveTintColor: theme.colors.tab.inactive,
        tabBarLabelStyle: {
          fontFamily: theme.fonts.sansMedium,
          fontSize: 11,
          marginTop: 0,
          paddingBottom: 2
        },
        tabBarIconStyle: { marginBottom: -2 }
      }}
    >
      <Tabs.Screen name="scanner" options={{ title: "Scanner", tabBarIcon: ({ color, focused }) => <TabIcon name="camera" color={color} focused={focused} /> }} />
      <Tabs.Screen name="analyze" options={{ title: "Analyze", tabBarIcon: ({ color, focused }) => <TabIcon name="search" color={color} focused={focused} /> }} />
      <Tabs.Screen name="airdrop" options={{ title: "Airdrop", tabBarIcon: ({ color, focused }) => <TabIcon name="gift" color={color} focused={focused} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ color, focused }) => <TabIcon name="user" color={color} focused={focused} /> }} />
    </Tabs>
  );
}
