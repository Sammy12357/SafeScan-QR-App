import { useEffect, useMemo } from "react";
import { ActivityIndicator, Linking, Text, useWindowDimensions, View } from "react-native";
import BottomSheet from "@gorhom/bottom-sheet";
import { CameraView, type BarcodeScanningResult } from "expo-camera";
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/Button";
import { theme } from "@/constants/theme";
import { useScanner } from "@/hooks/useScanner";
import { useScanStore } from "@/stores/scanStore";
import { truncateMiddle } from "@/utils/url";

const FRAME_SIZE = 272;
const CORNER_SIZE = 34;
const CORNER_WIDTH = 4;

function ScanCorner({ detected, style }: { detected: boolean; style: object }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(detected ? 1 : 0, { duration: 180 });
  }, [detected, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(progress.value, [0, 1], [theme.colors.textPrimary, theme.colors.safe])
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: CORNER_SIZE,
          height: CORNER_SIZE
        },
        style,
        animatedStyle
      ]}
    />
  );
}

function ScannerOverlay({ detected }: { detected: boolean }) {
  const { width, height } = useWindowDimensions();
  const top = (height - FRAME_SIZE) / 2;
  const left = (width - FRAME_SIZE) / 2;
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(withSequence(withTiming(0.45, { duration: 800 }), withTiming(1, { duration: 800 })), -1, true);
  }, [pulse]);

  const frameStyle = useAnimatedStyle(() => ({
    opacity: detected ? 1 : pulse.value
  }));

  return (
    <View pointerEvents="none" style={{ flex: 1 }}>
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: top, backgroundColor: theme.colors.scanner.overlayVignette }} />
      <View style={{ position: "absolute", left: 0, top, width: left, height: FRAME_SIZE, backgroundColor: theme.colors.scanner.overlayVignette }} />
      <View style={{ position: "absolute", right: 0, top, width: left, height: FRAME_SIZE, backgroundColor: theme.colors.scanner.overlayVignette }} />
      <View style={{ position: "absolute", left: 0, right: 0, top: top + FRAME_SIZE, bottom: 0, backgroundColor: theme.colors.scanner.overlayVignette }} />

      <Animated.View style={frameStyle}>
        <ScanCorner detected={detected} style={{ top, left, borderTopWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH }} />
        <ScanCorner detected={detected} style={{ top, left: left + FRAME_SIZE - CORNER_SIZE, borderTopWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH }} />
        <ScanCorner detected={detected} style={{ top: top + FRAME_SIZE - CORNER_SIZE, left, borderBottomWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH }} />
        <ScanCorner detected={detected} style={{ top: top + FRAME_SIZE - CORNER_SIZE, left: left + FRAME_SIZE - CORNER_SIZE, borderBottomWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH }} />
      </Animated.View>

      <Text style={{ position: "absolute", top: top + FRAME_SIZE + 24, alignSelf: "center", color: theme.colors.textSecondary, fontFamily: theme.fonts.sans }}>
        Align QR code within the frame
      </Text>
    </View>
  );
}

export default function ScannerScreen() {
  const insets = useSafeAreaInsets();
  const snapPoints = useMemo(() => ["15%"], []);
  const currentScan = useScanStore((state) => state.currentScan);
  const { hasPermission, isAnalyzing, error, onBarcodeScanned, cameraRef } = useScanner();
  const detected = isAnalyzing;

  if (hasPermission === null) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <ActivityIndicator color={theme.colors.accent} />
        <Text style={{ color: theme.colors.textSecondary, marginTop: 14 }}>Requesting camera access…</Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 18, paddingTop: insets.top + 28, paddingBottom: Math.max(insets.bottom, 18) + 18, justifyContent: "center", gap: 16 }}>
        <View style={{ borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, backgroundColor: theme.colors.surface, padding: 22, gap: 14, ...theme.shadows.panel }}>
          <Text style={{ ...theme.typography.eyebrow }}>SAFESCAN QR</Text>
          <Text style={{ color: theme.colors.textPrimary, fontSize: 30, fontFamily: theme.fonts.sansSemiBold }}>Camera access needed</Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 16, lineHeight: 24 }}>
            Enable camera permission to scan and analyze QR codes before opening anything.
          </Text>
          <Button title="Open Settings" onPress={() => Linking.openSettings()} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <CameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        facing="back"
        active={!isAnalyzing}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={isAnalyzing ? undefined : (result: BarcodeScanningResult) => onBarcodeScanned(result.data)}
      >
        <ScannerOverlay detected={detected} />
      </CameraView>

      <View style={{ position: "absolute", top: insets.top + 18, left: 18, right: 18 }}>
        <Text style={{ color: theme.colors.textPrimary, fontSize: 24, fontFamily: theme.fonts.sansSemiBold, textAlign: "center" }}>SafeScan QR</Text>
      </View>

      {isAnalyzing ? (
        <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.risk.card.overlayBg }}>
          <View style={{ borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, backgroundColor: theme.colors.surfaceElevated, paddingHorizontal: 22, paddingVertical: 18, alignItems: "center", gap: 12 }}>
            <ActivityIndicator color={theme.colors.accent} />
            <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.sansSemiBold }}>Analyzing…</Text>
          </View>
        </View>
      ) : null}

      {error ? (
        <View style={{ position: "absolute", left: 18, right: 18, bottom: Math.max(insets.bottom, 20) + 112, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.risk.danger.border, backgroundColor: theme.colors.risk.danger.bg, padding: 12 }}>
          <Text style={{ color: theme.colors.risk.danger.text, textAlign: "center" }}>{error}</Text>
        </View>
      ) : null}

      <BottomSheet
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose={false}
        backgroundStyle={{ backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border, borderWidth: 1 }}
        handleIndicatorStyle={{ backgroundColor: theme.colors.textSecondary }}
      >
        <View style={{ flex: 1, paddingHorizontal: 18, paddingBottom: Math.max(insets.bottom, 10), gap: 10 }}>
          <Text style={{ ...theme.typography.eyebrow, fontSize: 11 }}>LAST SCAN</Text>
          <View style={{ alignSelf: "flex-start", maxWidth: "100%", borderRadius: 999, borderWidth: 1, borderColor: currentScan ? theme.colors.border : theme.colors.primaryDim, backgroundColor: currentScan ? theme.colors.surface : theme.colors.primaryDim, paddingHorizontal: 12, paddingVertical: 8 }}>
            <Text style={{ color: currentScan ? theme.colors.textPrimary : theme.colors.accent, fontFamily: theme.fonts.sansSemiBold }}>
              {currentScan ? `${currentScan.verdict.toUpperCase()} · ${truncateMiddle(currentScan.url, 36)}` : "Ready to scan"}
            </Text>
          </View>
        </View>
      </BottomSheet>
    </View>
  );
}
