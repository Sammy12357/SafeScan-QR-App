import { View } from "react-native";
import { theme } from "@/constants/theme";

export function SkeletonLoader({ height = 80 }: { height?: number }) {
  return <View style={{ height, borderRadius: 12, backgroundColor: theme.colors.surfaceElevated, opacity: 0.7 }} />;
}
