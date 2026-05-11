import type { AnalyzeResult, Signal } from "@/utils/schemas";

const HIGH_RISK_TLDS = new Set(["zip", "mov", "click", "country", "kim", "loan", "party", "quest", "rest", "top", "work", "xyz"]);
const SHORTENER_HOSTS = new Set([
  "bit.ly",
  "cutt.ly",
  "goo.gl",
  "is.gd",
  "lnkd.in",
  "ow.ly",
  "rebrand.ly",
  "shorturl.at",
  "t.co",
  "tiny.cc",
  "tinyurl.com",
  "trib.al"
]);

const TRUSTED_DOMAINS = new Set([
  "apple.com",
  "github.com",
  "google.com",
  "microsoft.com",
  "youtu.be",
  "youtube.com"
]);

const CRYPTO_TERMS = ["airdrop", "approve", "claim", "connect", "drain", "mint", "phantom", "seed", "solana", "token", "wallet"];
const PHISHING_TERMS = ["account", "billing", "confirm", "login", "password", "recover", "secure", "signin", "support", "update", "verify"];
const SCRIPT_PATTERN = /(?:javascript:|<\s*script|<\s*svg|on(?:click|error|load)\s*=|alert\s*\(|document\.cookie|<\/(?:title|style|textarea|script)>)/i;
const SQL_INJECTION_PATTERN = /(?:\bor\b|\band\b)\s+\d+\s*=\s*\d+|union\s+select|drop\s+table|\/\*|--\s*$/i;
const SHELL_PATTERN = /(?:`[^`]+`|\b(?:curl|wget|bash|sh|powershell|cmd|echo|rm)\b\s+|;\s*(?:curl|wget|bash|sh|echo|rm)\b)/i;
const SENSITIVE_BRANDS: Record<string, string[]> = {
  apple: ["apple.com", "icloud.com"],
  auth0: ["auth0.com"],
  binance: ["binance.com"],
  coinbase: ["coinbase.com"],
  discord: ["discord.com"],
  google: ["google.com"],
  icloud: ["apple.com", "icloud.com"],
  metamask: ["metamask.io"],
  microsoft: ["microsoft.com", "live.com"],
  paypal: ["paypal.com"],
  phantom: ["phantom.app"],
  solana: ["solana.com"]
};

type LocalRisk = {
  score: number;
  signals: Signal[];
  threatType?: string;
  domain?: string;
  trustedDomain?: boolean;
};

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function signal(label: string, severity: Signal["severity"], result: string, description = result, passed = false): Signal {
  return {
    label,
    check: label,
    result,
    severity,
    description,
    passed
  };
}

function firstUrl(payload: string) {
  return payload.match(/https?:\/\/[^\s]+/i)?.[0] ?? "";
}

function hostnameParts(hostname: string) {
  const cleaned = hostname.toLowerCase().replace(/^www\./, "");
  return cleaned.split(".").filter(Boolean);
}

function registrableDomain(hostname: string) {
  const parts = hostnameParts(hostname);
  if (parts.length <= 2) return parts.join(".");
  const last = parts.at(-1) ?? "";
  const secondLast = parts.at(-2) ?? "";
  const thirdLast = parts.at(-3) ?? "";
  if (last.length === 2 && secondLast.length <= 3 && thirdLast) return `${thirdLast}.${secondLast}.${last}`;
  return `${secondLast}.${last}`;
}

function hasSensitiveBrandMismatch(hostname: string) {
  const normalizedHost = hostname.toLowerCase().replace(/^www\./, "");
  const compactHost = normalizedHost.replace(/[^a-z0-9]/g, "");

  for (const [brand, allowedDomains] of Object.entries(SENSITIVE_BRANDS)) {
    if (!compactHost.includes(brand)) continue;
    if (allowedDomains.some((domain) => normalizedHost === domain || normalizedHost.endsWith(`.${domain}`))) continue;
    return brand;
  }

  return "";
}

function includesAny(value: string, words: string[]) {
  return words.filter((word) => value.includes(word));
}

function severityWeight(severity: Signal["severity"]) {
  if (severity === "high") return 24;
  if (severity === "medium") return 12;
  return 0;
}

function scoreFromSignals(signals: Signal[]) {
  return signals.reduce((score, item) => score + (item.passed ? 0 : severityWeight(item.severity)), 0);
}

function verdictRank(verdict: AnalyzeResult["verdict"]) {
  if (verdict === "danger") return 3;
  if (verdict === "warn") return 2;
  return 1;
}

function verdictFromScore(score: number): AnalyzeResult["verdict"] {
  if (score >= 75) return "danger";
  if (score >= 35) return "warn";
  return "safe";
}

function legacyRiskFromVerdict(verdict: AnalyzeResult["verdict"]): AnalyzeResult["overallRisk"] {
  if (verdict === "danger") return "high";
  if (verdict === "warn") return "suspicious";
  return "safe";
}

function dedupeSignals(signals: Signal[]) {
  const seen = new Set<string>();
  return signals.filter((item) => {
    const key = `${item.label.toLowerCase()}|${item.result.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getUrlDomain(payload: string) {
  const decodedUrl = firstUrl(payload) || payload.trim();
  try {
    return registrableDomain(new URL(decodedUrl).hostname);
  } catch {
    return "";
  }
}

function isTrustedDomain(domain: string) {
  return TRUSTED_DOMAINS.has(domain);
}

function isConcreteHighRiskSignal(signal: Signal) {
  if (signal.passed || signal.severity !== "high") return false;
  const label = signal.label.toLowerCase();
  const result = signal.result.toLowerCase();
  const description = signal.description.toLowerCase();
  return /script|injection|command|wallet|drain|brand|spoof|punycode|raw ip|deception|executable|malware/.test(`${label} ${result} ${description}`);
}

function shouldIgnoreBackendSignal(signal: Signal, trustedDomain: boolean) {
  if (!trustedDomain) return false;
  const text = `${signal.label} ${signal.check} ${signal.result} ${signal.description}`.toLowerCase();
  return text.includes("redirect chain") || text.includes("domain differs") || text.includes("intermediate domain");
}

function computeUrlRisk(payload: string): LocalRisk {
  const decodedUrl = firstUrl(payload) || payload.trim();
  const signals: Signal[] = [];
  const rawPayload = payload.trim();

  if (SCRIPT_PATTERN.test(rawPayload)) {
    signals.push(signal("Executable script payload", "high", "JavaScript/HTML event-handler code detected.", "QR codes should not contain executable browser script or injected HTML event handlers."));
  }

  if (SHELL_PATTERN.test(rawPayload)) {
    signals.push(signal("Command injection payload", "high", "Shell command syntax detected.", "Backticks or shell commands in a QR payload can indicate command-injection test content or an unsafe execution target."));
  }

  if (SQL_INJECTION_PATTERN.test(rawPayload)) {
    signals.push(signal("SQL injection payload", "high", "SQL injection pattern detected.", "Boolean SQL fragments and comment markers are commonly used to test or exploit vulnerable systems."));
  }

  let parsed: URL;
  try {
    parsed = new URL(decodedUrl);
  } catch {
    const lower = decodedUrl.toLowerCase();
    const cryptoMatches = includesAny(lower, CRYPTO_TERMS);
    const attackScore = scoreFromSignals(signals);
    const score = attackScore ? Math.max(attackScore, 76) : cryptoMatches.length ? 38 : 8;
    return {
      score,
      signals: cryptoMatches.length
        ? [...signals, signal("Embedded action text", "medium", `Crypto/wallet words found: ${cryptoMatches.slice(0, 4).join(", ")}`, "The decoded QR text contains wallet-style language even though it is not a normal web URL.")]
        : signals.length
          ? signals
          : [signal("Payload format", "low", "No launchable web URL detected.", "SafeScan found plain text rather than a browser URL.", true)],
      threatType: signals.length ? "Executable or injection payload" : cryptoMatches.length ? "Suspicious wallet prompt" : "Plain text"
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  const hostParts = hostnameParts(hostname);
  const domain = registrableDomain(hostname);
  const trustedDomain = isTrustedDomain(domain);
  const tld = hostParts.at(-1) ?? "";
  const pathAndQuery = `${parsed.pathname} ${parsed.search}`.toLowerCase();
  const fullText = decodedUrl.toLowerCase();

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    signals.push(signal("Executable URI scheme", "high", `${parsed.protocol} URI detected.`, "Non-web URI schemes can trigger script execution, app actions, or other behavior outside normal browsing."));
  } else if (parsed.protocol !== "https:") {
    signals.push(signal("Transport security", "medium", "URL does not use HTTPS.", "QR links that open an unencrypted destination are easier to tamper with."));
  } else {
    signals.push(signal("Transport security", "low", "HTTPS URL.", "The decoded web URL uses HTTPS.", true));
  }

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    signals.push(signal("Host reputation", "high", "Raw IP address host.", "IP-address QR destinations hide the organization behind the link."));
  }

  if (hostname.includes("xn--")) {
    signals.push(signal("Domain spoofing", "high", "Internationalized/punycode domain.", "Punycode can be used for lookalike phishing domains."));
  }

  if (decodedUrl.includes("@")) {
    signals.push(signal("URL deception", "high", "URL contains an @ sign.", "Attackers use @ in URLs to disguise the real host."));
  }

  if (SHORTENER_HOSTS.has(domain) || SHORTENER_HOSTS.has(hostname)) {
    signals.push(signal("Redirect masking", "medium", "Known URL shortener.", "Shortened URLs hide the final destination until after the QR is opened."));
  }

  if (HIGH_RISK_TLDS.has(tld)) {
    signals.push(signal("TLD reputation", "medium", `.${tld} domain.`, "This top-level domain is frequently abused in short-lived phishing campaigns."));
  }

  const brandMismatch = hasSensitiveBrandMismatch(hostname);
  if (brandMismatch) {
    signals.push(signal("Brand impersonation", "high", `${brandMismatch} appears in an unrelated domain.`, `The host is ${hostname}, not an official ${brandMismatch} domain.`));
  }

  const cryptoMatches = includesAny(fullText, CRYPTO_TERMS);
  if (cryptoMatches.length) {
    signals.push(signal("Crypto pattern", cryptoMatches.some((term) => ["approve", "drain", "seed"].includes(term)) ? "high" : "medium", `Wallet/crypto words found: ${cryptoMatches.slice(0, 5).join(", ")}.`, "Wallet and airdrop language in QR links deserves extra caution before signing anything."));
  } else {
    signals.push(signal("Crypto pattern", "low", "No wallet-drain pattern found.", "No common wallet-drain words were found in the decoded payload.", true));
  }

  const phishingMatches = includesAny(pathAndQuery, PHISHING_TERMS);
  if (phishingMatches.length) {
    signals.push(signal("Phishing language", "medium", `Account/security words found: ${phishingMatches.slice(0, 5).join(", ")}.`, "Login, verification, and account-recovery wording can indicate credential harvesting."));
  }

  if (parsed.searchParams.has("redirect") || parsed.searchParams.has("url") || parsed.searchParams.has("next") || parsed.searchParams.has("continue")) {
    signals.push(signal("Redirect parameter", "medium", "Destination-changing query parameter detected.", "Redirect parameters can send users to a different final site after the first click."));
  }

  if (hostParts.length >= 4) {
    signals.push(signal("Subdomain depth", "medium", `${hostParts.length} domain labels.`, "Deep subdomains are often used to make a suspicious host look more official."));
  }

  if ((hostname.match(/-/g)?.length ?? 0) >= 3 || /\d{3,}/.test(hostname)) {
    signals.push(signal("Domain shape", "medium", "Unusual hostname pattern.", "Excessive hyphens or long number runs can be a sign of disposable phishing infrastructure."));
  }

  if (decodedUrl.length > 180) {
    signals.push(signal("URL length", "medium", "Very long URL.", "Long QR URLs can hide suspicious parameters from users."));
  }

  const suspiciousScore = scoreFromSignals(signals);
  const score = clampScore(Math.max(signals.some((item) => !item.passed && item.severity === "high") ? 76 : 6, suspiciousScore));
  const threatType = brandMismatch
    ? "Brand impersonation / phishing"
    : signals.some((item) => ["Executable script payload", "Executable URI scheme"].includes(item.label))
      ? "Executable script payload"
      : signals.some((item) => item.label.includes("injection"))
        ? "Injection test payload"
    : cryptoMatches.length
      ? "Wallet or crypto prompt"
      : phishingMatches.length
        ? "Credential phishing indicators"
        : "Benign or low-risk URL";

  return { score, signals, threatType, domain, trustedDomain };
}

export function enhanceAnalyzeResult(result: AnalyzeResult): AnalyzeResult {
  const { mlRisk: _ignoredMlRisk, ...baseResult } = result;
  const localRisk = computeUrlRisk(result.url);
  const trustedDomain = localRisk.trustedDomain ?? isTrustedDomain(getUrlDomain(result.url));
  const backendSignals = result.signals.filter((item) => !shouldIgnoreBackendSignal(item, trustedDomain));
  const ignoredBackendSignals = result.signals.length - backendSignals.length;
  const hasConcreteLocalHighRisk = localRisk.signals.some(isConcreteHighRiskSignal);
  const hasConcreteBackendHighRisk = backendSignals.some(isConcreteHighRiskSignal);
  const signalScore = scoreFromSignals(backendSignals);
  const ruleScore = clampScore(Math.max(localRisk.score, signalScore));
  const backendScore = clampScore(result.riskScore ?? result.confidenceScore ?? 0);
  const finalScore =
    trustedDomain && !hasConcreteLocalHighRisk && !hasConcreteBackendHighRisk
      ? clampScore(Math.max(ruleScore, Math.min(backendScore, 24)))
      : clampScore(Math.max(backendScore, ruleScore));
  const scoreVerdict = verdictFromScore(finalScore);
  const verdict = trustedDomain && !hasConcreteLocalHighRisk && !hasConcreteBackendHighRisk ? scoreVerdict : verdictRank(result.verdict) > verdictRank(scoreVerdict) ? result.verdict : scoreVerdict;
  const trustSignal =
    trustedDomain && ignoredBackendSignals
      ? [
          signal(
            "Trusted destination context",
            "low",
            `Generic redirect warning reduced for ${localRisk.domain}.`,
            "SafeScan did not find concrete script, wallet-drain, spoofing, or injection indicators, so a generic redirect-chain warning was not allowed to mark this trusted destination as dangerous.",
            true
          )
        ]
      : [];
  const signals = dedupeSignals([...trustSignal, ...localRisk.signals, ...backendSignals]);

  const verdictText =
    finalScore > backendScore
      ? `SafeScan raised the score from ${backendScore}/100 to ${finalScore}/100 because concrete QR safety checks found stronger risk indicators. Treat this as ${verdictLabels(verdict).toLowerCase()} and verify the destination before continuing.`
      : finalScore < backendScore
        ? `SafeScan reduced an over-broad backend warning because the decoded destination is a trusted domain and no concrete script, wallet-drain, spoofing, or injection indicators were found. Still verify the destination before continuing.`
      : result.verdictText;

  return {
    ...baseResult,
    riskScore: finalScore,
    confidenceScore: finalScore,
    verdict,
    verdictText,
    overallRisk: legacyRiskFromVerdict(verdict),
    signals,
    ruleScore,
    threatType: result.threatType ?? localRisk.threatType
  };
}

function verdictLabels(verdict: AnalyzeResult["verdict"]) {
  if (verdict === "danger") return "Dangerous";
  if (verdict === "warn") return "Caution";
  return "Safe";
}
