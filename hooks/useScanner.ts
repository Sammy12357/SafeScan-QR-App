import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { analyzeUrl, api, type AnalyzeResult } from "@/services/api";
import { useScanStore } from "@/stores/scanStore";

const REPEAT_SCAN_WINDOW_MS = 3000;

type RecentScan = {
  payload: string;
  scannedAt: number;
};

function fileNameFromUri(uri: string, fallback: string) {
  try {
    const last = uri.split("?")[0].split("#")[0].split("/").pop();
    return last && last.length > 0 ? decodeURIComponent(last) : fallback;
  } catch {
    return fallback;
  }
}

function mimeForUri(uri: string, fallback = "image/jpeg") {
  const lower = uri.split("?")[0].toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".heic")) return "image/heic";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".pdf")) return "application/pdf";
  return fallback;
}

function extensionForMime(mimeType: string) {
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  if (mimeType === "image/heic") return ".heic";
  if (mimeType === "image/svg+xml") return ".svg";
  if (mimeType === "application/pdf") return ".pdf";
  return ".jpg";
}

function ensureFileExtension(name: string, mimeType: string) {
  return /\.[a-z0-9]{2,5}$/i.test(name) ? name : `${name}${extensionForMime(mimeType)}`;
}

export function useScanner(): {
  hasPermission: boolean | null;
  isAnalyzing: boolean;
  isUploading: boolean;
  error: string | null;
  onBarcodeScanned: (data: string) => void;
  captureAndScan: (framedPayload?: string | null) => Promise<void>;
  pickFromLibrary: () => Promise<void>;
  cameraRef: RefObject<CameraView | null>;
} {
  const router = useRouter();
  const cameraRef = useRef<CameraView | null>(null);
  const recentScanRef = useRef<RecentScan | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [error, setError] = useState<string | null>(null);
  const addScan = useScanStore((state) => state.addScan);
  const queryClient = useQueryClient();

  const handleResult = useCallback((result: AnalyzeResult) => {
    const scanId = result.scanId || `${Date.now()}`;
    const scan = { ...result, scanId, id: scanId };
    queryClient.setQueryData(["scan-result", scanId], scan);
    addScan(scan);
    router.push({ pathname: "/scan-result/[id]", params: { id: scanId } });
  }, [addScan, queryClient, router]);

  const analyzeMutation = useMutation({
    mutationFn: (payload: string) => analyzeUrl(payload),
    onSuccess: handleResult,
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : "SafeScan could not analyze this QR code.");
    }
  });

  const fileMutation = useMutation({
    mutationFn: (file: { uri: string; name: string; mimeType: string }) => api.scan.file(file),
    onSuccess: (result) => handleResult({ ...result, source: "backend" }),
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : "SafeScan could not decode that file.");
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

  const pickFromLibrary = useCallback(async () => {
    setError(null);
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      setError("Photo library access is required to upload a QR image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: false,
      quality: 1
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset?.uri) return;
    const mimeType = asset.mimeType ?? mimeForUri(asset.uri);
    const name = ensureFileExtension(asset.fileName ?? fileNameFromUri(asset.uri, "qr-upload"), mimeType);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fileMutation.mutate({ uri: asset.uri, name, mimeType });
  }, [fileMutation]);

  const captureAndScan = useCallback(async (framedPayload?: string | null) => {
    setError(null);
    const payload = framedPayload?.trim();

    if (payload) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      analyzeMutation.mutate(payload);
      return;
    }

    const camera = cameraRef.current;
    if (!camera) {
      setError("Camera is not ready yet.");
      return;
    }

    try {
      const photo = await camera.takePictureAsync({
        quality: 0.9,
        skipProcessing: false
      });
      if (!photo?.uri) {
        setError("Could not capture a QR image.");
        return;
      }
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      fileMutation.mutate({
        uri: photo.uri,
        name: ensureFileExtension(fileNameFromUri(photo.uri, `qr-capture-${Date.now()}`), "image/jpeg"),
        mimeType: "image/jpeg"
      });
    } catch (captureError) {
      setError(captureError instanceof Error ? captureError.message : "Could not capture a QR image.");
    }
  }, [analyzeMutation, fileMutation]);

  return {
    hasPermission: permission ? permission.granted : null,
    isAnalyzing: analyzeMutation.isPending || fileMutation.isPending,
    isUploading: fileMutation.isPending,
    error,
    onBarcodeScanned,
    captureAndScan,
    pickFromLibrary,
    cameraRef
  };
}
