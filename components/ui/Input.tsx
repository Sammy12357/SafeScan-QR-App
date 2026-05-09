import { TextInput, type TextInputProps } from "react-native";
import { theme } from "@/constants/theme";

export function Input(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={theme.colors.muted}
      style={{
        minHeight: 44,
        borderRadius: 8,
        borderColor: theme.colors.border,
        borderWidth: 1,
        color: theme.colors.textPrimary,
        backgroundColor: theme.colors.surfaceElevated,
        paddingHorizontal: 14,
        fontFamily: theme.fonts.sans,
        fontSize: 14
      }}
      {...props}
    />
  );
}
