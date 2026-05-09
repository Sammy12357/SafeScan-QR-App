import { useEffect, useMemo, useRef } from "react";
import { Image, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Slot, usePathname, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OfflineBanner } from "@/components/OfflineBanner";
import { ServerWakeBanner } from "@/components/ServerWakeBanner";
import { ToastProvider } from "@/components/shared/ToastProvider";
import { colors } from "@/constants/theme";
import { useAuthStore } from "@/stores/authStore";

const publicRoutes = ["/auth/google", "/legal/privacy", "/legal/terms"];

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
      staleTime: 30_000,
      gcTime: 300_000
    }
  }
});

function SplashScreen() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
      <Image source={require("../assets/images/splash.png")} style={{ width: 132, height: 132 }} resizeMode="contain" />
    </View>
  );
}

function pathFromDeepLink(url: string) {
  const parsed = Linking.parse(url);
  const path = [parsed.hostname, parsed.path].filter(Boolean).join("/").replace(/^\/+/, "");

  if (path === "auth") return null;
  if (path === "airdrop") return "/(tabs)/airdrop";

  const scanResultMatch = path.match(/^scan-result\/([^/?#]+)/);
  if (scanResultMatch?.[1]) return `/scan-result/${encodeURIComponent(scanResultMatch[1])}`;

  return null;
}

function normalizeRoutePath(path: string) {
  return path.replace(/^\/\(tabs\)/, "");
}

function RootNavigator({ fontsLoaded }: { fontsLoaded: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const incomingUrl = Linking.useURL();
  const appRootUrl = useMemo(() => Linking.createURL("/"), []);
  const lastHandledUrl = useRef<string | null>(null);
  const lastRedirect = useRef<{ from: string; target: string } | null>(null);
  const hydrateFromStorage = useAuthStore((state) => state.hydrateFromStorage);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  useEffect(() => {
    if (!incomingUrl || incomingUrl === lastHandledUrl.current) return;
    lastHandledUrl.current = incomingUrl;
    Linking.parse(appRootUrl);

    const target = pathFromDeepLink(incomingUrl);
    if (target) router.push(target);
  }, [appRootUrl, incomingUrl, router]);

  useEffect(() => {
    if (isLoading || !fontsLoaded) return;

    const redirect = (target: string) => {
      if (normalizeRoutePath(pathname) === normalizeRoutePath(target)) {
        lastRedirect.current = null;
        return;
      }
      if (lastRedirect.current?.from === pathname && lastRedirect.current.target === target) return;
      lastRedirect.current = { from: pathname, target };
      router.replace(target);
    };

    if (lastRedirect.current && normalizeRoutePath(pathname) === normalizeRoutePath(lastRedirect.current.target)) lastRedirect.current = null;

    if (!isAuthenticated && pathname === "/") {
      redirect("/auth/google");
      return;
    }

    if (isAuthenticated && pathname === "/") {
      redirect("/(tabs)/scanner");
      return;
    }

    const isPublicRoute = publicRoutes.includes(pathname);
    if (!isAuthenticated && !isPublicRoute) {
      redirect("/auth/google");
      return;
    }

    if (isAuthenticated && pathname === "/auth/google") {
      redirect("/(tabs)/scanner");
    }
  }, [fontsLoaded, isAuthenticated, isLoading, pathname, router]);

  if (!fontsLoaded || isLoading) return <SplashScreen />;

  return (
    <>
      <StatusBar style="light" />
      <ErrorBoundary key={pathname}>
        <Slot />
      </ErrorBoundary>
      <OfflineBanner />
      <ServerWakeBanner />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    "Inter-Regular": require("../assets/fonts/Inter-Regular.ttf"),
    "Inter-Medium": require("../assets/fonts/Inter-Medium.ttf"),
    "Inter-SemiBold": require("../assets/fonts/Inter-SemiBold.ttf"),
    "Orbitron-Regular": require("../assets/fonts/Orbitron-Regular.ttf"),
    "Orbitron-Bold": require("../assets/fonts/Orbitron-Bold.ttf"),
    "Orbitron-Black": require("../assets/fonts/Orbitron-Black.ttf"),
    "SpaceGrotesk-Regular": require("../assets/fonts/SpaceGrotesk-Regular.ttf"),
    "SpaceGrotesk-Medium": require("../assets/fonts/SpaceGrotesk-Medium.ttf"),
    "SpaceGrotesk-SemiBold": require("../assets/fonts/SpaceGrotesk-SemiBold.ttf"),
    "SpaceMono-Regular": require("../assets/fonts/SpaceMono-Regular.ttf")
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <ToastProvider>
            <RootNavigator fontsLoaded={fontsLoaded} />
          </ToastProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
