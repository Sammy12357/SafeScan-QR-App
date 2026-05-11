const defaultAdminEmails = ["homzajoe@gmail.com", "restreposamuel2004@gmail.com"] as const;

function parseEmails(value = "") {
  return value
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function isConfiguredClientId(value = "") {
  return value.includes(".apps.googleusercontent.com") && !value.includes("YOUR_GOOGLE");
}

export const config = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://safescan-qr.onrender.com",
  googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "",
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "",
  googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? "",
  hasGoogleClientId: isConfiguredClientId(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "") || isConfiguredClientId(process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? ""),
  adminEmails: Array.from(new Set([...defaultAdminEmails, ...parseEmails(process.env.EXPO_PUBLIC_ADMIN_EMAILS)])),
  serverWakeDelayMs: 5000,
  analyzeTimeoutMs: 60000,
  appScheme: "safescan",
  appVersion: "1.0.0-beta"
} as const;

export type UserRole = "user" | "admin";

export function roleForEmail(email?: string | null): UserRole {
  return email && config.adminEmails.includes(email.trim().toLowerCase()) ? "admin" : "user";
}
