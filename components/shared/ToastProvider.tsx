import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { theme } from "@/constants/theme";

type ToastType = "success" | "error" | "info" | "warning";
type ToastContextValue = { showToast: (message: string, type?: ToastType) => void };

const ToastContext = createContext<ToastContextValue>({ showToast: () => undefined });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const value = useMemo(
    () => ({
      showToast: (nextMessage: string) => {
        setMessage(nextMessage);
        setTimeout(() => setMessage(null), 3000);
      }
    }),
    []
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {message ? (
        <View style={{ position: "absolute", left: 16, right: 16, bottom: 32, backgroundColor: theme.colors.surfaceElevated, borderRadius: 12, padding: 12 }}>
          <Text style={{ color: theme.colors.textPrimary, textAlign: "center" }}>{message}</Text>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
