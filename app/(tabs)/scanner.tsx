import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Linking, Pressable, Text, useWindowDimensions, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import BottomSheet from "@gorhom/bottom-sheet";
import { CameraView, type BarcodeScanningResult } from "expo-camera";
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/Button";
import { theme } from "@/constants/theme";
import { useScanner } from "@/hooks/useScanner";
import { useScanStore } from "@/stores/scanStore";
import { truncateMiddle } from "@/utils/url";

const MIN_FRAME_SIZE = 292;
const MAX_FRAME_SIZE = 344;
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

function ScannerOverlay({ detected, frameSize }: { detected: boolean; frameSize: number }) {
  const { width, height } = useWindowDimensions();
  const top = (height - frameSize) / 2;
  const left = (width - frameSize) / 2;
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
      <View style={{ position: "absolute", left: 0, top, width: left, height: frameSize, backgroundColor: theme.colors.scanner.overlayVignette }} />
      <View style={{ position: "absolute", right: 0, top, width: left, height: frameSize, backgroundColor: theme.colors.scanner.overlayVignette }} />
      <View style={{ position: "absolute", left: 0, right: 0, top: top + frameSize, bottom: 0, backgroundColor: theme.colors.scanner.overlayVignette }} />

      <Animated.View style={frameStyle}>
        <ScanCorner detected={detected} style={{ top, left, borderTopWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH }} />
        <ScanCorner detected={detected} style={{ top, left: left + frameSize - CORNER_SIZE, borderTopWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH }} />
        <ScanCorner detected={detected} style={{ top: top + frameSize - CORNER_SIZE, left, borderBottomWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH }} />
        <ScanCorner detected={detected} style={{ top: top + frameSize - CORNER_SIZE, left: left + frameSize - CORNER_SIZE, borderBottomWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH }} />
      </Animated.View>

      <Text style={{ position: "absolute", left: 18, right: 18, top: Math.max(top - 48, 108), color: theme.colors.textSecondary, fontFamily: theme.fonts.display, fontSize: 13, letterSpacing: 1, textAlign: "center" }}>
        Align QR code within the frame
      </Text>
    </View>
  );
}

export default function ScannerScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const snapPoints = useMemo(() => ["15%"], []);
  const currentScan = useScanStore((state) => state.currentScan);
  const { hasPermission, isAnalyzing, isUploading, error, captureAndScan, pickFromLibrary, cameraRef } = useScanner();
  const [qrInFrame, setQrInFrame] = useState(false);
  const [framedQrPayload, setFramedQrPayload] = useState<string | null>(null);
  const detectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frameSize = useMemo(() => Math.min(Math.max(width - 72, MIN_FRAME_SIZE), MAX_FRAME_SIZE), [width]);
  const frame = useMemo(() => {
    const left = (width - frameSize) / 2;
    const top = (height - frameSize) / 2;
    return {
      left,
      top,
      right: left + frameSize,
      bottom: top + frameSize
    };
  }, [frameSize, height, width]);
  const detected = isAnalyzing || qrInFrame;
  const uploadButtonBottom = Math.max(insets.bottom, 10) + 8;
  const captureButtonBottom = uploadButtonBottom + 66;

  useEffect(() => {
    return () => {
      if (detectionTimeoutRef.current) clearTimeout(detectionTimeoutRef.current);
    };
  }, []);

  const handleQrDetected = useCallback((result: BarcodeScanningResult) => {
    const margin = 8;
    const points = result.cornerPoints?.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y)) ?? [];
    const bounds = result.bounds;
    const box =
      points.length >= 4
        ? {
            left: Math.min(...points.map((point) => point.x)),
            top: Math.min(...points.map((point) => point.y)),
            right: Math.max(...points.map((point) => point.x)),
            bottom: Math.max(...points.map((point) => point.y))
          }
        : bounds?.size?.width && bounds?.size?.height
          ? {
              left: bounds.origin.x,
              top: bounds.origin.y,
              right: bounds.origin.x + bounds.size.width,
              bottom: bounds.origin.y + bounds.size.height
            }
          : null;

    const isInsideFrame = box
      ? box.left >= frame.left - margin &&
        box.top >= frame.top - margin &&
        box.right <= frame.right + margin &&
        box.bottom <= frame.bottom + margin
      : false;

    setQrInFrame(isInsideFrame);
    setFramedQrPayload(isInsideFrame ? result.data.trim() : null);
    if (detectionTimeoutRef.current) clearTimeout(detectionTimeoutRef.current);
    detectionTimeoutRef.current = setTimeout(() => {
      setQrInFrame(false);
      setFramedQrPayload(null);
    }, 650);
  }, [frame]);

  if (hasPermission === null) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <ActivityIndicator color={theme.colors.accent} />
        <Text style={{ color: theme.colors.textSecondary, marginTop: 14, fontFamily: theme.fonts.display }}>Requesting camera access...</Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingHorizontal: 18, paddingTop: insets.top + 28, paddingBottom: Math.max(insets.bottom, 18) + 18, justifyContent: "center", gap: 16 }}>
        <View style={{ borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, backgroundColor: theme.colors.surface, padding: 22, gap: 14, ...theme.shadows.panel }}>
          <Text style={{ ...theme.typography.eyebrow }}>SAFESCAN QR</Text>
          <Text style={{ color: theme.colors.textPrimary, fontSize: 30, fontFamily: theme.fonts.display }}>Camera access needed</Text>
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
        onBarcodeScanned={isAnalyzing ? undefined : handleQrDetected}
      />
      <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
        <ScannerOverlay detected={detected} frameSize={frameSize} />
      </View>

      <View style={{ position: "absolute", top: insets.top + 18, left: 18, right: 18 }}>
        <Text style={{ color: theme.colors.textPrimary, fontSize: 24, fontFamily: theme.fonts.display, textAlign: "center", letterSpacing: 0.4 }}>SafeScan QR</Text>
      </View>

      {isAnalyzing ? (
        <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.risk.card.overlayBg }}>
          <View style={{ borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, backgroundColor: theme.colors.surfaceElevated, paddingHorizontal: 22, paddingVertical: 18, alignItems: "center", gap: 12 }}>
            <ActivityIndicator color={theme.colors.accent} />
            <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.display }}>{isUploading ? "Decoding upload..." : "Analyzing..."}</Text>
          </View>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Capture and scan QR code"
        onPress={() => captureAndScan(framedQrPayload)}
        disabled={isAnalyzing}
        style={({ pressed }) => ({
          position: "absolute",
          alignSelf: "center",
          bottom: captureButtonBottom,
          width: 54,
          height: 54,
          borderRadius: 27,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surfaceElevated,
          alignItems: "center",
          justifyContent: "center",
          opacity: isAnalyzing ? 0.5 : pressed ? 0.82 : 1
        })}
      >
        <Feather name="camera" size={24} color={theme.colors.textPrimary} />
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={pickFromLibrary}
        disabled={isAnalyzing}
        style={({ pressed }) => ({
          position: "absolute",
          alignSelf: "center",
          bottom: uploadButtonBottom,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surfaceElevated,
          opacity: isAnalyzing ? 0.5 : pressed ? 0.85 : 1
        })}
      >
        <Feather name="image" size={16} color={theme.colors.textPrimary} />
        <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.display, fontSize: 12 }}>Upload QR</Text>
      </Pressable>

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
            <Text style={{ color: currentScan ? theme.colors.textPrimary : theme.colors.accent, fontFamily: theme.fonts.display }}>
              {currentScan ? `${currentScan.verdict.toUpperCase()} - ${truncateMiddle(currentScan.url, 36)}` : "Ready to scan"}
            </Text>
          </View>
        </View>
      </BottomSheet>
    </View>
  );
}
