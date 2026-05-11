import { Component, type ErrorInfo, type ReactNode } from "react";
import { Text, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { theme } from "@/constants/theme";

type State = { hasError: boolean };

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: theme.colors.background, alignItems: "center", justifyContent: "center", padding: 16 }}>
          <Text style={{ color: theme.colors.textPrimary, marginBottom: 12 }}>Something went wrong.</Text>
          <Button title="Retry" onPress={() => this.setState({ hasError: false })} />
        </View>
      );
    }
    return this.props.children;
  }
}
