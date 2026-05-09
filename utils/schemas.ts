import { z } from "zod";

const IsoStringSchema = z.string().min(1);
const SeveritySchema = z.enum(["low", "medium", "high"]);
const RiskVerdictSchema = z.enum(["safe", "warn", "danger"]);
const LegacyRiskSchema = z.enum(["safe", "suspicious", "high"]);

function riskScoreToVerdict(score: number) {
  if (score >= 80) return "danger" as const;
  if (score >= 40) return "warn" as const;
  return "safe" as const;
}

function legacyRiskToVerdict(risk?: z.infer<typeof LegacyRiskSchema>) {
  if (risk === "high") return "danger" as const;
  if (risk === "suspicious") return "warn" as const;
  return "safe" as const;
}

function verdictToLegacyRisk(verdict: z.infer<typeof RiskVerdictSchema>) {
  if (verdict === "danger") return "high" as const;
  if (verdict === "warn") return "suspicious" as const;
  return "safe" as const;
}

function tierNameToNumber(tier?: string) {
  if (tier === "Guardian") return 4 as const;
  if (tier === "Referrer") return 3 as const;
  if (tier === "Scanner") return 2 as const;
  return 1 as const;
}

const RawSignalSchema = z.object({
  label: z.string().optional(),
  check: z.string().optional(),
  result: z.string().optional(),
  severity: SeveritySchema,
  description: z.string().optional(),
  detail: z.string().optional(),
  passed: z.boolean().optional()
});

const MlRiskSchema = z
  .object({
    enabled: z.boolean(),
    score: z.number().min(0).max(100).optional(),
    label: z.string().optional(),
    benignProbability: z.number().min(0).max(1).optional(),
    maliciousProbability: z.number().min(0).max(1).optional(),
    model: z.string().optional(),
    inputSource: z.string().optional(),
    reason: z.string().optional()
  })
  .passthrough();

export const SignalSchema = RawSignalSchema.transform((signal) => {
  const label = signal.label ?? signal.check ?? "Signal";
  const result = signal.result ?? label;
  const description = signal.description ?? signal.detail ?? result;
  return {
    label,
    check: signal.check ?? label,
    result,
    severity: signal.severity,
    description,
    passed: signal.passed
  };
});

export const UserSchema = z
  .object({
    id: z.string().optional(),
    email: z.string().email(),
    name: z.string().optional(),
    avatarUrl: z.string().url().optional(),
    picture: z.string().url().optional(),
    createdAt: IsoStringSchema.optional(),
    role: z.enum(["user", "admin"]).optional()
  })
  .transform((user) => ({
    id: user.id ?? user.email,
    email: user.email,
    name: user.name ?? user.email.split("@")[0] ?? "Safe scanner",
    avatarUrl: user.avatarUrl ?? user.picture,
    createdAt: user.createdAt ?? new Date(0).toISOString(),
    role: user.role
  }));

export const AnalyzeResultSchema = z
  .object({
    scanId: z.string().optional(),
    id: z.string().optional(),
    url: z.string(),
    riskScore: z.number().min(0).max(100).optional(),
    confidenceScore: z.number().min(0).max(100).optional(),
    verdict: z.union([RiskVerdictSchema, z.string()]).optional(),
    verdictText: z.string().optional(),
    overallRisk: LegacyRiskSchema.optional(),
    signals: z.array(SignalSchema),
    analyzedAt: IsoStringSchema.optional(),
    scannedAt: IsoStringSchema.optional(),
    counted: z.boolean().optional(),
    scanCount: z.number().optional(),
    payloadType: z.string().optional(),
    source: z.enum(["backend", "demo-fallback"]).optional(),
    mlRisk: MlRiskSchema.optional(),
    ruleScore: z.number().min(0).max(100).optional(),
    threatType: z.string().optional()
  })
  .transform((result) => {
    const riskScore = result.riskScore ?? result.confidenceScore ?? 0;
    const verdict =
      result.verdict === "safe" || result.verdict === "warn" || result.verdict === "danger"
        ? result.verdict
        : result.overallRisk
          ? legacyRiskToVerdict(result.overallRisk)
          : riskScoreToVerdict(riskScore);
    return {
      scanId: result.scanId ?? result.id ?? `${result.url}:${result.analyzedAt ?? result.scannedAt ?? ""}`,
      url: result.url,
      riskScore,
      verdict,
      verdictText: result.verdictText ?? (result.verdict && !["safe", "warn", "danger"].includes(result.verdict) ? result.verdict : verdict),
      signals: result.signals,
      analyzedAt: result.analyzedAt ?? result.scannedAt ?? new Date(0).toISOString(),
      overallRisk: result.overallRisk ?? verdictToLegacyRisk(verdict),
      confidenceScore: riskScore,
      scannedAt: result.scannedAt ?? result.analyzedAt ?? new Date(0).toISOString(),
      counted: result.counted,
      scanCount: result.scanCount,
      payloadType: result.payloadType,
      source: result.source,
      ...(result.mlRisk ? { mlRisk: result.mlRisk } : {}),
      ...(result.ruleScore !== undefined ? { ruleScore: result.ruleScore } : {}),
      ...(result.threatType ? { threatType: result.threatType } : {})
    };
  });

export const ScanHistoryItemSchema = z
  .object({
    scanId: z.string().optional(),
    id: z.string().optional(),
    url: z.string(),
    verdict: z.union([RiskVerdictSchema, z.string()]),
    riskScore: z.number().min(0).max(100).optional(),
    risk_score: z.number().min(0).max(100).optional(),
    analyzedAt: IsoStringSchema.optional(),
    scannedAt: IsoStringSchema.optional(),
    created_at: IsoStringSchema.optional(),
    signals: z.array(SignalSchema).optional(),
    reported: z.union([z.boolean(), z.number()]).optional()
  })
  .transform((scan) => ({
    scanId: scan.scanId ?? scan.id ?? `${scan.url}:${scan.analyzedAt ?? scan.scannedAt ?? scan.created_at ?? ""}`,
    id: scan.id ?? scan.scanId ?? `${scan.url}:${scan.analyzedAt ?? scan.scannedAt ?? scan.created_at ?? ""}`,
    url: scan.url,
    verdict: scan.verdict,
    riskScore: scan.riskScore ?? scan.risk_score ?? 0,
    analyzedAt: scan.analyzedAt ?? scan.scannedAt ?? scan.created_at ?? new Date(0).toISOString(),
    scannedAt: scan.scannedAt ?? scan.analyzedAt ?? scan.created_at ?? new Date(0).toISOString(),
    signals: scan.signals ?? [],
    reported: Boolean(scan.reported)
  }));

export const AirdropStatusSchema = z
  .object({
    tier: z.number().min(1).max(4).optional(),
    totalScans: z.number().optional(),
    nextTierAt: z.number().optional(),
    rewardSol: z.number().optional(),
    scanCount: z.number().optional(),
    referrals: z.number().optional(),
    currentTier: z.string().optional(),
    walletConnected: z.boolean().optional(),
    walletAddress: z.string().nullable().optional(),
    airdropStatus: z.string().optional(),
    fraudScore: z.number().optional(),
    referralCode: z.string().nullable().optional(),
    referralLink: z.string().nullable().optional(),
    nextMilestone: z.string().optional()
  })
  .transform((status) => {
    const totalScans = status.totalScans ?? status.scanCount ?? 0;
    const tier = status.tier ?? tierNameToNumber(status.currentTier);
    const nextTierAt = status.nextTierAt ?? (tier >= 4 ? totalScans : tier === 1 ? 5 : 50);
    return {
      tier,
      totalScans,
      nextTierAt,
      rewardSol: status.rewardSol ?? 0,
      scanCount: totalScans,
      referrals: status.referrals ?? 0,
      currentTier: status.currentTier ?? `Tier ${tier}`,
      walletConnected: status.walletConnected ?? false,
      walletAddress: status.walletAddress,
      airdropStatus: status.airdropStatus ?? "eligible",
      fraudScore: status.fraudScore ?? 0,
      referralCode: status.referralCode,
      referralLink: status.referralLink,
      nextMilestone: status.nextMilestone ?? "Keep scanning to unlock the next tier."
    };
  });

export const ReferralStatsSchema = z
  .object({
    referralCode: z.string().optional(),
    code: z.string().optional(),
    referralLink: z.string().url().optional(),
    link: z.string().url().optional(),
    totalReferrals: z.number().optional(),
    referrals: z.number().optional(),
    pendingRewards: z.number().optional()
  })
  .transform((stats) => ({
    referralCode: stats.referralCode ?? stats.code ?? "",
    referralLink: stats.referralLink ?? stats.link ?? "",
    totalReferrals: stats.totalReferrals ?? stats.referrals ?? 0,
    pendingRewards: stats.pendingRewards ?? 0,
    code: stats.code ?? stats.referralCode ?? "",
    link: stats.link ?? stats.referralLink ?? "",
    referrals: stats.referrals ?? stats.totalReferrals ?? 0
  }));

export const UserProfileSchema = UserSchema.and(
  z.object({
    walletAddress: z.string().nullable().optional(),
    airdropStatus: z.string().optional(),
    scanCount: z.number().optional(),
    referrals: z.number().optional(),
    tier: z.string().optional(),
    walletConnected: z.boolean().optional()
  })
).transform((profile) => ({
  ...profile,
  walletAddress: profile.walletAddress,
  airdropStatus: profile.airdropStatus ?? "eligible",
  scanCount: profile.scanCount ?? 0,
  referrals: profile.referrals ?? 0,
  tier: profile.tier ?? "Pending",
  walletConnected: profile.walletConnected ?? Boolean(profile.walletAddress)
}));

export const WalletConnectResponseSchema = z.object({
  success: z.boolean()
});

export const AuthResponseSchema = z
  .object({
    accessToken: z.string().optional(),
    refreshToken: z.string().optional(),
    session: z.string().optional(),
    user: UserSchema
  })
  .transform((auth) => {
    const accessToken = auth.accessToken ?? auth.session ?? "";
    return {
      accessToken,
      refreshToken: auth.refreshToken ?? accessToken,
      user: auth.user
    };
  });

export const TokenPairSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string()
});

export const WalletStatusSchema = z.object({
  connected: z.boolean(),
  walletAddress: z.string().nullable().optional(),
  verified: z.boolean().optional(),
  connectedAt: IsoStringSchema.optional(),
  onchain: z
    .object({
      solBalance: z.number().nullable().optional(),
      txCount: z.number().nullable().optional(),
      walletAgeDays: z.number().nullable().optional(),
      verifiedAt: IsoStringSchema.nullable().optional()
    })
    .optional()
});

export const WalletNonceResponseSchema = z.object({
  nonce: z.string(),
  message: z.string(),
  expiresAt: IsoStringSchema
});

export const ReportResponseSchema = z.object({
  id: z.string().optional(),
  status: z.string().optional()
});

export const EmptyResponseSchema = z.unknown();
export const UnknownResponseSchema = z.unknown();

export type Signal = z.infer<typeof SignalSchema>;
export type User = z.infer<typeof UserSchema>;
export type AnalyzeResult = z.infer<typeof AnalyzeResultSchema>;
export type AnalyzeResponse = AnalyzeResult;
export type ScanHistoryItem = z.infer<typeof ScanHistoryItemSchema>;
export type AirdropStatus = z.infer<typeof AirdropStatusSchema>;
export type AirdropStatusResponse = AirdropStatus;
export type ReferralStats = z.infer<typeof ReferralStatsSchema>;
export type ReferralResponse = ReferralStats;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type UserProfileResponse = UserProfile;
export type WalletConnectResponse = z.infer<typeof WalletConnectResponseSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type TokenPair = z.infer<typeof TokenPairSchema>;
export type WalletStatus = z.infer<typeof WalletStatusSchema>;
export type WalletStatusResponse = WalletStatus;
export type WalletNonceResponse = z.infer<typeof WalletNonceResponseSchema>;
