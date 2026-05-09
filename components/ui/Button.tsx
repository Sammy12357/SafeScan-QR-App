import { Pressable, Text, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { theme } from "@/constants/theme";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = PressableProps & {
  title: string;
  variant?: ButtonVariant;
  className?: string;
};

const buttonClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary border-primary",
  secondary: "bg-transparent border-border",
  ghost: "bg-transparent border-transparent",
  danger: "bg-risk-danger-bg border-risk-danger-border"
};

const textColors: Record<ButtonVariant, string> = {
  primary: theme.colors.primaryButtonText,
  secondary: theme.colors.textPrimary,
  ghost: theme.colors.primary,
  danger: theme.colors.risk.danger.text
};

export function Button({ title, variant = "primary", disabled, className = "", style, ...props }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      className={`min-h-[44px] items-center justify-center rounded-web border px-5 py-3 ${buttonClasses[variant]} ${className}`}
      style={(state) => [
        {
          opacity: disabled ? 0.5 : 1,
          transform: [{ translateY: state.pressed ? -1 : 0 }, { scale: state.pressed ? 0.98 : 1 }]
        },
        variant === "primary" ? { elevation: 3, shadowColor: theme.colors.primaryStrong, shadowOpacity: 0.18, shadowRadius: 18 } : null,
        typeof style === "function" ? style(state) : (style as StyleProp<ViewStyle>)
      ]}
      {...props}
    >
      <Text className="font-display text-button" style={{ color: textColors[variant], fontFamily: theme.fonts.display }}>
        {title}
      </Text>
    </Pressable>
  );
}
