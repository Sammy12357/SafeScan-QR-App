import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { analyzeUrl } from "@/services/api";
import { useScanStore } from "@/stores/scanStore";

const REPEAT_SCAN_WINDOW_MS = 3000;

type RecentScan = {
  payload: string;
  scannedAt: number;
};

export function useScanner(): {
  hasPermission: boolean | null;
  isAnalyzing: boolean;
  error: string | null;
  onBarcodeScanned: (data: string) => void;
  cameraRef: RefObject<CameraView | null>;
} {
  const router = useRouter();
  const cameraRef = useRef<CameraView | null>(null);
  const recentScanRef = useRef<RecentScan | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [error, setError] = useState<string | null>(null);
  const addScan = useScanStore((state) => state.addScan);
  const queryClient = useQueryClient();

  const analyzeMutation = useMutation({
    mutationFn: (payload: string) => analyzeUrl(payload),
    onSuccess: (result) => {
      const scanId = result.scanId || `${Date.now()}`;
      const scan = { ...result, scanId, id: scanId };
      queryClient.setQueryData(["scan-result", scanId], scan);
      addScan(scan);
      router.push({ pathname: "/scan-result/[id]", params: { id: scanId } });
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : "SafeScan could not analyze this QR code.");
    }
  });

  useEffect(() => {
    if (!permission) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  const onBarcodeScanned = useCallback(
    (data: string) => {
      const payload = data.trim();
      const now = Date.now();
      const recent = recentScanRef.current;

      if (!payload || analyzeMutation.isPending) return;
      if (recent?.payload === payload && now - recent.scannedAt < REPEAT_SCAN_WINDOW_MS) return;

      recentScanRef.current = { payload, scannedAt: now };
      setError(null);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      analyzeMutation.mutate(payload);
    },
    [analyzeMutation]
  );

  return {
    hasPermission: permission ? permission.granted : null,
    isAnalyzing: analyzeMutation.isPending,
    error,
    onBarcodeScanned,
    cameraRef
  };
}
