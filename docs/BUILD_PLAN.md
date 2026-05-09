# SafeScan QR Android Build Plan

This app is a native Android frontend for SafeScan QR. The backend stays at `https://safescan-qr.onrender.com`.

## 01 Project Setup

```bash
npx create-expo-app safescan-android --template expo-template-blank-typescript
cd safescan-android
npx expo install expo-router
eas build:configure
```

This repo is already scaffolded with the planned structure, route groups, theme tokens, stores, API service, and component placeholders.

## 02 Dependencies

Install Expo-managed packages:

```bash
npx expo install nativewind tailwindcss expo-camera expo-secure-store \
  expo-auth-session expo-web-browser expo-haptics expo-clipboard \
  expo-linear-gradient expo-image-picker expo-notifications expo-font \
  expo-linking react-native-reanimated react-native-svg \
  react-native-bottom-sheet react-native-safe-area-context \
  react-native-gesture-handler @expo/vector-icons
```

Install npm packages:

```bash
npm install @tanstack/react-query @solana/web3.js \
  @solana-mobile/mobile-wallet-adapter-protocol \
  zustand zod date-fns
```

Recommended additions for later phases:

```bash
npm install @shopify/flash-list react-native-qrcode-svg react-native-confetti-cannon
```

## 03 Design System

Tokens live in `constants/theme.ts` and are mirrored in `tailwind.config.js`.

Rules:

- Screen padding: `16`
- Card radius: `12`
- Pill radius: `999`
- Inter for UI text
- Space Mono for addresses, hashes, and code-like values
- No raw colors in components unless extending the theme first

## 04 File Structure

The project follows the requested structure:

- `app/` for Expo Router screens
- `components/` for shared UI and feature components
- `hooks/` for feature logic
- `stores/` for Zustand state
- `services/` for API, storage, and notifications
- `utils/` for permissions, risk, URLs, sharing
- `constants/` for theme, config, tiers

## 05 Screens

Implemented as stubs ready for feature work:

- Landing hero: `app/index.tsx`
- Google OAuth: `app/auth/google.tsx`
- Scanner: `app/(tabs)/scanner.tsx`
- Analyzer: `app/(tabs)/analyze.tsx`
- Airdrop: `app/(tabs)/airdrop.tsx`
- Profile: `app/(tabs)/profile.tsx`
- Scan result: `app/scan-result/[id].tsx`
- Legal: `app/legal/privacy.tsx`, `app/legal/terms.tsx`

## 06 API Layer

`services/api.ts` contains typed wrappers for:

- `POST /api/analyze`
- `GET /api/user/profile`
- `GET /api/airdrop/status`
- `POST /api/report`
- `GET /api/referral/stats`
- `GET /api/scan/history`
- `POST /api/wallet/connect`
- `POST /auth/verify`
- `POST /auth/refresh`
- `DELETE /api/user`

All responses should be Zod-validated before use.

## 07 Key Implementation Constraints

- Expo Camera v14 uses `CameraView`, not `Camera`.
- SecureStore values must be strings.
- Wrap the root in `GestureHandlerRootView`.
- OAuth redirect URI must match `safescan://auth`.
- Render cold starts can take 30-45 seconds, so show `ServerWakeBanner` after 5 seconds.
- Never auto-open a scanned URL. Always analyze first.
- Use Reanimated UI-thread animations for scanner and result transitions.

## 08 Release Path

Preview:

```bash
npx eas build --platform android --profile preview
```

Production:

```bash
npx eas build --platform android --profile production
```

Play Console:

- App title: SafeScan QR
- Category: Tools
- Content rating: Everyone
- Data Safety: authentication, scan payloads, optional wallet address, referral stats

## Codex Kickoff Prompt

```text
Context: I'm converting SafeScan QR (safescan-qr.onrender.com) into a native
Android app. Backend stays at that URL. All work is React Native frontend only.

Stack: Expo SDK 51, Expo Router, NativeWind, Reanimated, expo-camera CameraView,
expo-auth-session, React Query, Zustand, SecureStore, Bottom Sheet, SVG gauge.

Design: Dark theme. Tokens in constants/theme.ts. Never hardcode colors in
components.

Constraints:
- No boxShadow in RN; use elevation/shadow helpers.
- SecureStore values must be strings.
- GestureHandlerRootView wraps the root.
- Backend cold-starts; show ServerWakeBanner after 5s.
- Never auto-open QR URLs.
```
