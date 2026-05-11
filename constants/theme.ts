const alpha = (hex: string, opacityHex: string) => `${hex}${opacityHex}`;

export const webVars = {
  bodyFont: '"Space Grotesk", "Aptos", "Segoe UI", sans-serif',
  displayFont: '"Orbitron", "Space Grotesk", "Aptos", "Segoe UI", sans-serif',
  bg: "#09111f",
  panel: "rgba(13, 24, 43, 0.88)",
  panelStrong: "rgba(10, 18, 33, 0.95)",
  text: "#edf4ff",
  muted: "#98a9c2",
  accent: "#67f2c8",
  accentStrong: "#1fd6a3",
  warning: "#ffbb55",
  danger: "#ff6e7f",
  safe: "#50e3a4",
  blue: "#5a8cff",
  violet: "#8d6bff",
  line: "rgba(255, 255, 255, 0.09)",
  shadow: "0 28px 80px rgba(0, 0, 0, 0.35)",
  radius: 8
} as const;

export const colors = {
  bg: webVars.bg,
  background: webVars.bg,
  backgroundEnd: "#111827",
  surface: webVars.panel,
  surfaceElevated: webVars.panelStrong,
  surfaceBorder: webVars.line,
  border: webVars.line,

  primary: webVars.accent,
  primaryLight: webVars.accentStrong,
  primaryStrong: webVars.accentStrong,
  primaryDim: "rgba(103, 242, 200, 0.15)",
  primaryGlow: "rgba(103, 242, 200, 0.30)",
  primaryButtonText: "#041019",

  accent: webVars.accent,
  accentStrong: webVars.accentStrong,
  accentDim: "rgba(103, 242, 200, 0.15)",
  blue: webVars.blue,
  blueDim: "rgba(90, 140, 255, 0.15)",
  violet: webVars.violet,
  violetDim: "rgba(141, 107, 255, 0.15)",

  safe: webVars.safe,
  safeDim: "rgba(80, 227, 164, 0.15)",
  warn: webVars.warning,
  warning: webVars.warning,
  suspicious: webVars.warning,
  suspiciousDim: "rgba(255, 187, 85, 0.15)",
  danger: webVars.danger,
  dangerDim: "rgba(255, 110, 127, 0.15)",

  textPrimary: webVars.text,
  textSecondary: webVars.muted,
  textMuted: webVars.muted,
  muted: webVars.muted,
  textDisabled: alpha(webVars.muted, "66"),

  gradientStart: "#060b12",
  gradientMid: "#0a1420",
  gradientEnd: "#111827",

  risk: {
    safe: {
      bg: "rgba(80, 227, 164, 0.16)",
      text: webVars.safe,
      border: "rgba(80, 227, 164, 0.38)",
      indicatorBg: webVars.safe,
      indicatorText: "#031017",
      indicatorGlow: "rgba(80, 227, 164, 0.38)",
      gaugeGlow: "rgba(80, 227, 164, 0.24)"
    },
    warn: {
      bg: "rgba(255, 187, 85, 0.16)",
      text: webVars.warning,
      border: "rgba(255, 187, 85, 0.38)",
      indicatorBg: webVars.warning,
      indicatorText: "#031017",
      indicatorGlow: "rgba(255, 187, 85, 0.32)",
      gaugeGlow: "rgba(255, 187, 85, 0.22)"
    },
    danger: {
      bg: "rgba(255, 110, 127, 0.16)",
      text: webVars.danger,
      border: "rgba(255, 110, 127, 0.42)",
      indicatorBg: webVars.danger,
      indicatorText: "#031017",
      indicatorGlow: "rgba(255, 110, 127, 0.36)",
      gaugeGlow: "rgba(255, 110, 127, 0.26)"
    },
    warningBanner: {
      bg: "rgba(255, 110, 127, 0.16)",
      border: "rgba(255, 110, 127, 0.38)",
      text: "#ffd7dc"
    },
    card: {
      bg: "rgba(8, 16, 29, 0.98)",
      border: "rgba(255, 255, 255, 0.12)",
      overlayBg: "rgba(3, 8, 15, 0.82)",
      shadow: "rgba(0, 0, 0, 0.52)",
      gaugeTrack: "rgba(255, 255, 255, 0.09)",
      gaugeInnerBg: "rgba(8, 16, 29, 0.98)",
      gaugeInnerBorder: "rgba(255, 255, 255, 0.08)"
    },
    severity: {
      low: {
        bg: "rgba(80, 227, 164, 0.10)",
        text: webVars.safe,
        border: "rgba(80, 227, 164, 0.28)"
      },
      medium: {
        bg: "rgba(255, 187, 85, 0.10)",
        text: webVars.warning,
        border: "rgba(255, 187, 85, 0.28)"
      },
      high: {
        bg: "rgba(255, 110, 127, 0.11)",
        text: webVars.danger,
        border: "rgba(255, 110, 127, 0.30)"
      }
    }
  },

  scanner: {
    frameBgStart: "rgba(103, 242, 200, 0.08)",
    frameBgEnd: "rgba(61, 119, 255, 0.15)",
    frameBorder: "rgba(103, 242, 200, 0.20)",
    frameActiveBorder: "rgba(103, 242, 200, 0.80)",
    frameActiveInset: "rgba(103, 242, 200, 0.25)",
    frameActiveGlow: "rgba(103, 242, 200, 0.18)",
    gridLight: "rgba(237, 244, 255, 0.95)",
    gridAccent: "rgba(103, 242, 200, 0.95)",
    scanLineGlow: "rgba(103, 242, 200, 0.70)",
    overlayVignette: "rgba(10, 10, 15, 0.75)"
  },

  tab: {
    bg: webVars.panel,
    active: webVars.accent,
    inactive: webVars.muted,
    border: webVars.line
  }
} as const;

export const font = {
  ui: "SpaceGrotesk-Regular",
  uiMedium: "SpaceGrotesk-Medium",
  uiSemiBold: "SpaceGrotesk-SemiBold",
  mono: "SpaceMono-Regular",
  display: "Orbitron-Bold",
  displayRegular: "Orbitron-Regular",
  displayBlack: "Orbitron-Black",
  inter: "Inter-Regular",
  interMedium: "Inter-Medium",
  interSemiBold: "Inter-SemiBold"
} as const;

export const fonts = {
  sans: font.ui,
  sansMedium: font.uiMedium,
  sansSemiBold: font.uiSemiBold,
  display: font.display,
  displayRegular: font.displayRegular,
  displayBlack: font.displayBlack,
  mono: font.mono
} as const;

export const fontSizes = {
  lockedBadge: 12,
  footerColHeader: 11,
  footerBottom: 12,
  footerBrandDesc: 13,
  body: 14,
  footerLink: 14,
  footerBrandName: 15,
  button: 15,
  heroText: 17,
  h3: 18,
  heroProblem: 20,
  h2: 22,
  footerNewsletterTitle: 23,
  riskIndicator: 25,
  scoreGauge: 28,
  h1: 28,
  legalH1: 38,
  riskModalTitle: 42,
  scoreValue: 48,
  heroTitleMin: 54,
  heroTitleMax: 106
} as const;

export const fontWeights = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  extraBold: "800",
  black: "900"
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  screenPad: 16,
  cardPad: 20,
  cardRadius: 12,
  badgeRadius: 999,
  pillRadius: webVars.radius
} as const;

export const shadows = {
  webPanel: webVars.shadow,
  cardPurple: {
    elevation: 8,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12
  },
  panel: {
    elevation: 8,
    shadowColor: "#000000",
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 28 },
    shadowRadius: 80
  },
  cardSubtle: {
    elevation: 3,
    shadowColor: "#000000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6
  }
} as const;

export const typography = {
  h1: { fontFamily: fonts.display, fontSize: fontSizes.h1, color: colors.textPrimary },
  h2: { fontFamily: fonts.display, fontSize: fontSizes.h2, color: colors.textPrimary },
  h3: { fontFamily: fonts.sansMedium, fontSize: fontSizes.h3, color: colors.textPrimary },
  body: { fontFamily: fonts.sans, fontSize: fontSizes.body, color: colors.textSecondary, lineHeight: 22 },
  label: { fontFamily: fonts.display, fontSize: fontSizes.lockedBadge, color: colors.textMuted },
  mono: { fontFamily: fonts.mono, fontSize: fontSizes.lockedBadge, color: colors.textSecondary },
  badge: { fontFamily: fonts.display, fontSize: fontSizes.footerColHeader, letterSpacing: 0.6 },
  eyebrow: { fontFamily: fonts.display, fontSize: fontSizes.lockedBadge, color: colors.accent, letterSpacing: 1.9 },
  tierRank: { fontFamily: fonts.display, fontSize: 13, color: colors.accent, letterSpacing: 2.1 },
  tierReward: { fontFamily: fonts.display, fontSize: 12, color: colors.accent, letterSpacing: 1.1 },
  verdict: { fontFamily: fonts.displayBlack, fontSize: fontSizes.riskModalTitle, color: colors.textPrimary }
} as const;

export const theme = {
  webVars,
  colors,
  spacing: {
    screen: spacing.screenPad,
    card: spacing.cardPad,
    ...spacing
  },
  radius: {
    card: spacing.cardRadius,
    pill: spacing.badgeRadius,
    web: webVars.radius
  },
  font,
  fonts,
  fontSizes,
  fontWeights,
  typography,
  shadows
} as const;

export type Theme = typeof theme;
