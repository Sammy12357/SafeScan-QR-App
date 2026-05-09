import { z } from "zod";
import {
  AirdropStatusSchema,
  AnalyzeResultSchema,
  AuthResponseSchema,
  EmptyResponseSchema,
  ReferralStatsSchema,
  ReportResponseSchema,
  ScanHistoryItemSchema,
  TokenPairSchema,
  UnknownResponseSchema,
  UserProfileSchema,
  WalletConnectResponseSchema,
  WalletNonceResponseSchema,
  WalletStatusSchema,
  type AirdropStatus,
  type AirdropStatusResponse,
  type AnalyzeResponse,
  type AnalyzeResult,
  type AuthResponse,
  type ReferralResponse,
  type ReferralStats,
  type ScanHistoryItem,
  type Signal,
  type TokenPair,
  type User,
  type UserProfile,
  type UserProfileResponse,
  type WalletNonceResponse,
  type WalletStatus,
  type WalletStatusResponse
} from "@/utils/schemas";

const AUTH_TOKEN_KEY = "auth_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const DEFAULT_TIMEOUT_MS = 60000;
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
let accessToken: string | null = null;
let refreshTokenValue: string | null = null;

const endpoints = {
  authVerify: "/auth/verify",
  authRefresh: "/auth/refresh",
  authLogout: "/auth/logout",
  health: "/api/health",
  wakeAnalyze: "/api/analyze",
  scanAnalyze: "/api/scan",
  scanHistory: "/api/scan/history",
  scanReport: "/api/report",
  userProfile: "/api/user/profile",
  userDelete: "/api/user",
  airdropStatus: "/api/airdrop/status",
  walletStatus: "/api/wallet",
  walletConnect: "/api/wallet/nonce",
  walletDisconnect: "/api/wallet",
  walletNonce: "/api/wallet/nonce",
  walletVerify: "/api/wallet/verify",
  referralStats: "/api/referral",
  reputation: "/api/check-reputation",
  redirects: "/api/trace-redirects",
  domain: "/api/check-domain",
  cryptoPatterns: "/api/check-crypto-patterns"
} as const;

export interface ApiError extends Error {
  status: number;
  body: unknown;
}

export class SafeScanApiError extends Error implements ApiError {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown) {
    super(`SafeScan API ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export type {
  AirdropStatus,
  AirdropStatusResponse,
  AnalyzeResponse,
  AnalyzeResult,
  AuthResponse,
  ReferralResponse,
  ReferralStats,
  ScanHistoryItem,
  Signal,
  User,
  UserProfile,
  UserProfileResponse,
  WalletNonceResponse,
  WalletStatus,
  WalletStatusResponse
};

type RequestOptions = RequestInit & {
  auth?: boolean;
  retry?: boolean;
  timeoutMs?: number;
};

function apiUrl(path: string) {
  if (!API_BASE_URL) throw new SafeScanApiError(0, { error: "Missing EXPO_PUBLIC_API_BASE_URL" });
  return `${API_BASE_URL}${path}`;
}

async function readBody(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function setApiTokens(tokens: Partial<TokenPair>) {
  if (tokens.accessToken !== undefined) accessToken = tokens.accessToken;
  if (tokens.refreshToken !== undefined) refreshTokenValue = tokens.refreshToken;
}

export function clearApiTokens() {
  accessToken = null;
  refreshTokenValue = null;
}

export function getApiAccessToken() {
  return accessToken;
}

function parseResponse<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, body: unknown): T {
  try {
    return schema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) throw new SafeScanApiError(422, error.flatten());
    throw error;
  }
}

async function refreshAccessToken() {
  if (!refreshTokenValue) throw new SafeScanApiError(401, { error: "Missing refresh token" });

  const body = await request(endpoints.authRefresh, {
    method: "POST",
    auth: false,
    retry: false,
    body: JSON.stringify({ refreshToken: refreshTokenValue })
  });
  const tokens = parseResponse(TokenPairSchema, body);
  setApiTokens(tokens);
  return tokens;
}

async function request(path: string, options: RequestOptions = {}): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const headers = new Headers(options.headers);

  headers.set("Content-Type", "application/json");
  if (options.auth !== false) {
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  }

  try {
    const response = await fetch(apiUrl(path), {
      ...options,
      signal: controller.signal,
      headers
    });

    if (response.status === 401 && options.auth !== false && options.retry !== false) {
      await refreshAccessToken();
      return request(path, { ...options, retry: false });
    }

    const body = await readBody(response);
    if (!response.ok) throw new SafeScanApiError(response.status, body);
    return body;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeReportReason(reason: string) {
  const normalized = reason.toLowerCase();
  const validReasons = ["phishing", "wallet_drain", "malware", "spam", "other"];
  if (validReasons.includes(normalized)) return normalized;
  if (normalized.includes("wallet")) return "wallet_drain";
  if (normalized.includes("malware")) return "malware";
  if (normalized.includes("spam")) return "spam";
  if (normalized.includes("phish") || normalized.includes("block")) return "phishing";
  return "other";
}

export const api = {
  auth: {
    async verifyToken(idToken: string) {
      const body = await request(endpoints.authVerify, {
        method: "POST",
        auth: false,
        body: JSON.stringify({ token: idToken })
      });
      const result = parseResponse(AuthResponseSchema, body);
      setApiTokens(result);
      return result;
    },
    async refreshToken(refreshToken: string) {
      const body = await request(endpoints.authRefresh, {
        method: "POST",
        auth: false,
        retry: false,
        body: JSON.stringify({ refreshToken })
      });
      const result = parseResponse(TokenPairSchema, body);
      setApiTokens(result);
      return result;
    },
    async logout(sessionOverride?: string | null) {
      const headers = new Headers();
      if (sessionOverride) headers.set("Authorization", `Bearer ${sessionOverride}`);
      try {
        const body = await request(endpoints.authLogout, {
          method: "POST",
          headers,
          retry: false
        });
        parseResponse(EmptyResponseSchema, body);
      } finally {
        clearApiTokens();
      }
    }
  },
  scan: {
    analyze(payload: string) {
      return request(endpoints.scanAnalyze, {
        method: "POST",
        body: JSON.stringify({ payload })
      }).then((body) => parseResponse(AnalyzeResultSchema, body));
    },
    history() {
      return request(endpoints.scanHistory).then((body) => parseResponse(z.array(ScanHistoryItemSchema), body));
    },
    async report(scanId: string, reason: string) {
      const body = await request(endpoints.scanReport, {
        method: "POST",
        body: JSON.stringify({ url: scanId, reason: normalizeReportReason(reason) })
      });
      parseResponse(ReportResponseSchema, body);
    }
  },
  user: {
    profile() {
      return request(endpoints.userProfile).then((body) => parseResponse(UserProfileSchema, body));
    },
    async delete() {
      const body = await request(endpoints.userDelete, { method: "DELETE" });
      parseResponse(EmptyResponseSchema, body);
    }
  },
  airdrop: {
    status() {
      return request(endpoints.airdropStatus).then((body) => parseResponse(AirdropStatusSchema, body));
    }
  },
  wallet: {
    async connect(publicKey: string) {
      const body = await request(endpoints.walletConnect, {
        method: "POST",
        body: JSON.stringify({ walletAddress: publicKey })
      });
      parseResponse(WalletNonceResponseSchema, body);
    },
    status() {
      return request(endpoints.walletStatus).then((body) => parseResponse(WalletStatusSchema, body));
    },
    nonce(walletAddress: string) {
      return request(endpoints.walletNonce, {
        method: "POST",
        body: JSON.stringify({ walletAddress })
      }).then((body) => parseResponse(WalletNonceResponseSchema, body));
    },
    verify(walletAddress: string, signature: string) {
      return request(endpoints.walletVerify, {
        method: "POST",
        body: JSON.stringify({ walletAddress, signature })
      }).then((body) => parseResponse(WalletConnectResponseSchema, body));
    },
    disconnect() {
      return request(endpoints.walletDisconnect, { method: "DELETE" }).then((body) => parseResponse(WalletConnectResponseSchema, body));
    }
  },
  referral: {
    stats() {
      return request(endpoints.referralStats).then((body) => parseResponse(ReferralStatsSchema, body));
    }
  },
  checks: {
    reputation(url: string) {
      return request(endpoints.reputation, {
        method: "POST",
        body: JSON.stringify({ url })
      }).then((body) => parseResponse(UnknownResponseSchema, body));
    },
    redirects(url: string) {
      return request(endpoints.redirects, {
        method: "POST",
        body: JSON.stringify({ url })
      }).then((body) => parseResponse(UnknownResponseSchema, body));
    },
    domain(url: string) {
      return request(endpoints.domain, {
        method: "POST",
        body: JSON.stringify({ url })
      }).then((body) => parseResponse(UnknownResponseSchema, body));
    },
    cryptoPatterns(url: string) {
      return request(endpoints.cryptoPatterns, {
        method: "POST",
        body: JSON.stringify({ url })
      }).then((body) => parseResponse(UnknownResponseSchema, body));
    }
  },
  system: {
    async health() {
      try {
        const body = await request(endpoints.health, {
          method: "GET",
          auth: false,
          retry: false,
          timeoutMs: 5000
        });
        parseResponse(UnknownResponseSchema, body);
        return true;
      } catch (error) {
        if (error instanceof SafeScanApiError && error.status === 404) return false;
        throw error;
      }
    },
    async wakeAnalyze(url: string) {
      const body = await request(endpoints.wakeAnalyze, {
        method: "POST",
        auth: false,
        retry: false,
        timeoutMs: 5000,
        body: JSON.stringify({ url })
      });
      parseResponse(UnknownResponseSchema, body);
    }
  }
};

export async function analyzeUrl(payload: string): Promise<AnalyzeResponse> {
  try {
    const result = await api.scan.analyze(payload);
    return { ...result, source: "backend" };
  } catch {
    return { ...mockAnalyzeResponse(payload), source: "demo-fallback" };
  }
}

export async function verifyGoogleToken(token: string) {
  const result = await api.auth.verifyToken(token);
  return { session: result.accessToken, user: result.user };
}

export function logoutSession(sessionOverride?: string | null) {
  return api.auth.logout(sessionOverride);
}

export async function fetchProfile(): Promise<UserProfileResponse> {
  return api.user.profile();
}

export async function fetchAirdropStatus(): Promise<AirdropStatusResponse> {
  return api.airdrop.status();
}

export async function reportUrl(url: string, reason: string) {
  try {
    const body = await request(endpoints.scanReport, {
      method: "POST",
      body: JSON.stringify({ url, reason: normalizeReportReason(reason) })
    });
    parseResponse(ReportResponseSchema, body);
    return { queued: false, url, reason };
  } catch {
    return { queued: true, url, reason };
  }
}

export function checkReputation(url: string) {
  return api.checks.reputation(url);
}

export function traceRedirects(url: string) {
  return api.checks.redirects(url);
}

export function checkDomain(url: string) {
  return api.checks.domain(url);
}

export function checkCryptoPatterns(url: string) {
  return api.checks.cryptoPatterns(url);
}

export function fetchWalletStatus() {
  return api.wallet.status();
}

export function disconnectWallet() {
  return api.wallet.disconnect();
}

export function fetchReferralStatus() {
  return api.referral.stats();
}

export function requestWalletNonce(walletAddress: string) {
  return api.wallet.nonce(walletAddress);
}

export function verifyWallet(walletAddress: string, signature: string) {
  return api.wallet.verify(walletAddress, signature);
}

export function mockAnalyzeResponse(input: string): AnalyzeResponse {
  const normalized = input.trim() || "https://claim-sqr-airdrop.xyz/connect?approve=all";
  const suspicious = /airdrop|claim|drain|approve|wallet|\.xyz|bit\.ly|tinyurl|t\.co/i.test(normalized);
  const high = /drain|approve|wallet|\.xyz/i.test(normalized);
  const overallRisk: AnalyzeResponse["overallRisk"] = high ? "high" : suspicious ? "suspicious" : "safe";
  const confidenceScore = high ? 91 : suspicious ? 68 : 18;
  const signals: Signal[] = high
    ? [
        {
          label: "Domain Age",
          check: "Domain Age",
          result: "8 days old",
          severity: "high",
          description: "Newly registered domains are often used for short-lived QR phishing campaigns.",
          passed: false
        },
        {
          label: "Wallet Drain Pattern",
          check: "Wallet Drain Pattern",
          result: "Approval or wallet action detected",
          severity: "high",
          description: "The payload includes words commonly found in wallet-drain prompts, including approve, claim, or wallet connection language.",
          passed: false
        },
        {
          label: "Redirect Chain",
          check: "Redirect Chain",
          result: "2 hops detected",
          severity: "medium",
          description: "Multiple redirects make it harder for users to understand the final destination before signing or paying.",
          passed: false
        },
        {
          label: "TLD Reputation",
          check: "TLD Reputation",
          result: "Non-standard TLD",
          severity: "low",
          description: "The domain uses a TLD frequently seen in low-cost phishing infrastructure.",
          passed: false
        }
      ]
    : suspicious
      ? [
          {
            label: "Campaign Language",
            check: "Campaign Language",
            result: "Airdrop or claim terms found",
            severity: "medium",
            description: "Airdrop and claim language can be legitimate, but it deserves extra caution when delivered through a QR code.",
            passed: false
          },
          {
            label: "Redirect Chain",
            check: "Redirect Chain",
            result: "No high-risk redirect pattern",
            severity: "low",
            description: "SafeScan did not detect a known URL shortener or suspicious final-domain swap in this demo pass.",
            passed: true
          }
        ]
      : [
          {
            label: "URL Format",
            check: "URL Format",
            result: "Valid HTTPS URL",
            severity: "low",
            description: "The payload uses a standard HTTPS URL and no wallet-drain keywords were detected in the mobile demo check.",
            passed: true
          }
        ];

  return {
    scanId: `mock:${normalized}`,
    url: normalized,
    riskScore: confidenceScore,
    verdict: overallRisk === "high" ? "danger" : overallRisk === "suspicious" ? "warn" : "safe",
    verdictText:
      overallRisk === "high"
        ? "This QR code shows strong indicators of a phishing or wallet-drain flow. Block it unless you independently trust the sender and destination."
        : overallRisk === "suspicious"
          ? "This QR code includes campaign-style language and should be reviewed before continuing. SafeScan recommends checking the destination and avoiding wallet approvals."
          : "This QR code does not show obvious high-risk signals in the mobile demo check. Continue only if the destination matches what you expected.",
    analyzedAt: new Date().toISOString(),
    overallRisk,
    confidenceScore,
    counted: undefined,
    scanCount: undefined,
    payloadType: undefined,
    source: "demo-fallback",
    signals,
    scannedAt: new Date().toISOString()
  };
}
