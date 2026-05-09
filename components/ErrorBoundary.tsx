import React, { type ErrorInfo, type ReactNode } from "react";
import { Text, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { theme } from "@/constants/theme";

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = {
    error: null
  };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (__DEV__) {
      console.error(error, errorInfo.componentStack);
    }
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 24, backgroundColor: theme.colors.background }}>
        <Text style={{ color: theme.colors.textPrimary, fontSize: 24, textAlign: "center", fontFamily: theme.fonts.sansSemiBold }}>Something went wrong</Text>
        {__DEV__ ? (
          <Text style={{ color: theme.colors.textSecondary, textAlign: "center", fontFamily: theme.fonts.sans }}>
            {this.state.error.message}
          </Text>
        ) : null}
        <Button title="Retry" onPress={this.reset} />
      </View>
    );
  }
}
