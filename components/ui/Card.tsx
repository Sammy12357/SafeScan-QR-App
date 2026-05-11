import { View, type ViewProps } from "react-native";
import { theme } from "@/constants/theme";

type CardProps = ViewProps & {
  className?: string;
  elevated?: boolean;
};

export function Card({ className = "", elevated = false, style, ...props }: CardProps) {
  return (
    <View
      className={`rounded-web border border-border bg-surface p-[22px] ${className}`}
      style={[elevated ? theme.shadows.panel : theme.shadows.cardSubtle, style]}
      {...props}
    />
  );
}
