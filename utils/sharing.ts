import { Share } from "react-native";
import type { AnalyzeResponse } from "@/services/api";

export async function shareScanReport(scan: AnalyzeResponse) {
  await Share.share({
    title: "SafeScan QR report",
    message: `SafeScan QR verdict: ${scan.overallRisk.toUpperCase()}\nScore: ${scan.confidenceScore}/100\nURL: ${scan.url}\n\n${scan.verdict}`
  });
}
