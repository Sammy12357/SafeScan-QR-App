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
- Sign in with Google through the SafeScan Auth0 tenant.
- Connect a Solana mobile wallet.
- Show airdrop tier progress.
- Share scan reports and referral links.

Guest camera scans of direct web URLs use the public `/api/analyze` JSON endpoint. Payment and app-action payloads and image uploads require a backend sign-in. A failed or incomplete backend check never becomes a demo SAFE verdict.

The mobile sign-in client uses the `safe-scan-qr.us.auth0.com` tenant and its Native application. The SafeScan backend validates the Auth0 issuer and client ID before creating a session. In the Auth0 dashboard, leave `google-oauth2` enabled for the mobile application and `Username-Password-Authentication` disabled. Native builds use the registered `safescan://auth` callback; Expo Go uses the `https://auth.expo.io/@fellowbeast/safescan-android/` proxy callback. Both must remain in the application's Allowed Callback URLs.

## Development Phases

1. Foundation: Expo scaffold, design system, stores, API layer.
2. Auth and navigation shell.
3. Core scanner and risk result flow.
4. Analyzer, airdrop, profile, legal screens.
5. Offline, cold-start, accessibility, and QA polish.
6. EAS preview build, internal testing, production AAB.

See [docs/BUILD_PLAN.md](docs/BUILD_PLAN.md) for the full implementation blueprint.
