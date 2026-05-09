import { theme } from "@/constants/theme";

export type RiskLevel = "safe" | "suspicious" | "high";

export function scoreToRisk(score: number): RiskLevel {
  if (score > 70) return "high";
  if (score >= 40) return "suspicious";
  return "safe";
}

export function riskToColor(risk: RiskLevel): string {
  if (risk === "high") return theme.colors.danger;
  if (risk === "suspicious") return theme.colors.suspicious;
  return theme.colors.safe;
}

export function riskToLabel(risk: RiskLevel): string {
  if (risk === "high") return "DANGER";
  if (risk === "suspicious") return "CAUTION";
  return "SAFE";
}
