# SafeScan QR Android

Native Android app shell for SafeScan QR, built with React Native and Expo.

The backend remains unchanged:

- Production API: `https://safescan-qr.onrender.com`
- Android package: `com.safescan.qr`
- Deep link scheme: `safescan://`

## Stack

- Expo SDK 51+
- Expo Router
- NativeWind
- TypeScript strict mode
- React Query
- Zustand
- Expo Camera `CameraView`
- Expo SecureStore
- Expo Auth Session
- React Native Reanimated

## First Run

```bash
npm install
npx expo install
npx expo start
```

For native modules such as camera, secure storage, wallet adapter, and notifications, use a development build rather than relying only on Expo Go.

```bash
npx eas build:configure
npx eas build --platform android --profile preview
```

## Repo Goal

This repo converts the SafeScan QR web app into a production-ready native Android app while keeping the web backend untouched.

Core flows:

- Scan QR codes with the camera.
- Analyze payloads through `/api/analyze`.
- Show a full-screen risk verdict and signal breakdown.
- Track scan history.
- Connect Google OAuth.
- Connect a Solana mobile wallet.
- Show airdrop tier progress.
- Share scan reports and referral links.

## Development Phases

1. Foundation: Expo scaffold, design system, stores, API layer.
2. Auth and navigation shell.
3. Core scanner and risk result flow.
4. Analyzer, airdrop, profile, legal screens.
5. Offline, cold-start, accessibility, and QA polish.
6. EAS preview build, internal testing, production AAB.

See [docs/BUILD_PLAN.md](docs/BUILD_PLAN.md) for the full implementation blueprint.
