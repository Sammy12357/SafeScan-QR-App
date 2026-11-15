import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { api, clearApiTokens, SafeScanApiError, setApiTokens, type AgeChallenge, type TermsChallenge, type User } from "@/services/api";
import { roleForEmail } from "@/constants/config";
import { useAdultChallengeStore } from "@/stores/adultChallengeStore";

const AUTH_TOKEN_KEY = "auth_token";
const REFRESH_TOKEN_KEY = "refresh_token";

type AuthState = {
  user: User | null;
  walletAddress: string | null;
  isAuthenticated: boolean;
  // Bumped when a verified backend session starts or ends so protected screens
  // refresh only after authorization is established.
  apiSessionVersion: number;
  hasBackendSession: boolean;
  ageChallenge: AgeChallenge | null;
  termsChallenge: TermsChallenge | null;
  isLoading: boolean;
  error: string | null;
};

type AuthStore = AuthState & {
  exchangeAuth0IdToken: (idToken: string) => Promise<void>;
  completeAgeChallenge: (birthYear: number, birthdayThisYear: "yes" | "no", legalConsent: boolean) => Promise<void>;
  completeTermsChallenge: (legalConsent: boolean) => Promise<void>;
  continueAsDemoUser: () => void;
  logout: () => Promise<void>;
  hydrateFromStorage: () => Promise<void>;
  setUser: (user: User) => void;
  setWalletAddress: (walletAddress: string | null) => void;
  adultConfirmed: () => void;
};

const initialState: AuthState = {
  user: null,
  walletAddress: null,
  isAuthenticated: false,
  apiSessionVersion: 0,
  hasBackendSession: false,
  ageChallenge: null,
  termsChallenge: null,
  isLoading: true,
  error: null
};

function normalizeUser(user: User): User {
  return { ...user, role: roleForEmail(user.email) };
}

async function clearStoredSession() {
  clearApiTokens();
  await Promise.all([
    SecureStore.deleteItemAsync(AUTH_TOKEN_KEY).catch(() => {}),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => {})
  ]);
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  ...initialState,
  continueAsDemoUser: () => {
    void clearStoredSession();
    useAdultChallengeStore.getState().dismiss();
    set({
      user: normalizeUser({
        id: "demo-user",
        email: "demo@safescan.local",
        name: "SafeScan Demo",
        avatarUrl: undefined,
        createdAt: new Date().toISOString(),
        role: "user"
      }),
      walletAddress: null,
      isAuthenticated: true,
      hasBackendSession: false,
      ageChallenge: null,
      termsChallenge: null,
      isLoading: false,
      error: null
    });
  },
  exchangeAuth0IdToken: async (idToken) => {
    // The backend can require an age answer before issuing any account session.
    try {
      const result = await api.auth.verifyToken(idToken);
      if ("ageConfirmationRequired" in result) {
        await clearStoredSession();
        set({
          user: null,
          isAuthenticated: false,
          hasBackendSession: false,
          ageChallenge: result,
          termsChallenge: null,
          isLoading: false,
          error: null
        });
        return;
      }
      if ("termsAcceptanceRequired" in result) {
        await clearStoredSession();
        set({
          user: null,
          isAuthenticated: false,
          hasBackendSession: false,
          ageChallenge: null,
          termsChallenge: result,
          isLoading: false,
          error: null
        });
        return;
      }
      await Promise.all([
        SecureStore.setItemAsync(AUTH_TOKEN_KEY, result.accessToken),
        SecureStore.setItemAsync(REFRESH_TOKEN_KEY, result.refreshToken)
      ]);
      setApiTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken });
      set((state) => ({
        // Merge so the local Auth0 mirror (if it ran) isn't downgraded by a
        // sparser backend response.
        user: normalizeUser({ ...(state.user ?? {}), ...result.user } as User),
        isAuthenticated: true,
        hasBackendSession: true,
        ageChallenge: null,
        termsChallenge: null,
        apiSessionVersion: state.apiSessionVersion + 1,
        isLoading: false,
        error: null
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "SafeScan backend rejected the Auth0 token.";
      await clearStoredSession();
      set({ user: null, isAuthenticated: false, hasBackendSession: false, ageChallenge: null, termsChallenge: null, isLoading: false, error: message });
      throw error;
    }
  },
  completeAgeChallenge: async (birthYear, birthdayThisYear, legalConsent) => {
    const challenge = get().ageChallenge;
    if (!challenge) throw new Error("Start sign-in again to confirm your age.");
    const agreement = challenge.termsVersion && challenge.privacyVersion
      ? { termsVersion: challenge.termsVersion, privacyVersion: challenge.privacyVersion }
      : undefined;
    if (Boolean(challenge.termsVersion) !== Boolean(challenge.privacyVersion) || (agreement && !legalConsent)) {
      throw new Error("Review and agree to the current Terms and Privacy Policy.");
    }
    set({ isLoading: true, error: null });
    try {
      const result = await api.auth.confirmAge(challenge.ageTicket, birthYear, birthdayThisYear, agreement);
      await Promise.all([
        SecureStore.setItemAsync(AUTH_TOKEN_KEY, result.accessToken),
        SecureStore.setItemAsync(REFRESH_TOKEN_KEY, result.refreshToken)
      ]);
      setApiTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken });
      set((state) => ({
        user: normalizeUser(result.user),
        walletAddress: null,
        isAuthenticated: true,
        hasBackendSession: true,
        ageChallenge: null,
        termsChallenge: null,
        apiSessionVersion: state.apiSessionVersion + 1,
        isLoading: false,
        error: null
      }));
    } catch (error) {
      const status = error instanceof SafeScanApiError ? error.status : 0;
      if (status === 403 || status === 409 || status === 410) {
        set({ ageChallenge: null, termsChallenge: null, isLoading: false, error: "Age confirmation could not be completed. Start sign-in again later." });
      } else {
        set({ isLoading: false, error: error instanceof Error ? error.message : "Age confirmation failed. Try again." });
      }
      throw error;
    }
  },
  completeTermsChallenge: async (legalConsent) => {
    const challenge = get().termsChallenge;
    if (!challenge || !legalConsent) throw new Error("Review and agree to the current Terms and Privacy Policy.");
    set({ isLoading: true, error: null });
    try {
      const result = await api.auth.acceptTerms(challenge.termsTicket, challenge.termsVersion, challenge.privacyVersion);
      await Promise.all([
        SecureStore.setItemAsync(AUTH_TOKEN_KEY, result.accessToken),
        SecureStore.setItemAsync(REFRESH_TOKEN_KEY, result.refreshToken)
      ]);
      setApiTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken });
      set((state) => ({
        user: normalizeUser(result.user),
        walletAddress: null,
        isAuthenticated: true,
        hasBackendSession: true,
        ageChallenge: null,
        termsChallenge: null,
        apiSessionVersion: state.apiSessionVersion + 1,
        isLoading: false,
        error: null
      }));
    } catch (error) {
      const status = error instanceof SafeScanApiError ? error.status : 0;
      if (status === 409 || status === 410) {
        set({ termsChallenge: null, isLoading: false, error: "Agreement confirmation expired. Start sign-in again." });
      } else {
        set({ isLoading: false, error: error instanceof Error ? error.message : "Agreement confirmation failed. Try again." });
      }
      throw error;
    }
  },
  logout: async () => {
    useAdultChallengeStore.getState().dismiss();
    try {
      await api.auth.logout();
    } catch {
      // Local sign-out must still work when the backend is unreachable.
    } finally {
      clearApiTokens();
      await Promise.all([
        SecureStore.deleteItemAsync(AUTH_TOKEN_KEY),
        SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)
      ]);
      set((state) => ({
        ...initialState,
        // Bump version on logout too, so any cached views know to drop data.
        apiSessionVersion: state.apiSessionVersion + 1,
        isLoading: false
      }));
    }
  },
  hydrateFromStorage: async () => {
    set({ isLoading: true, error: null });
    const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
    if (!token) {
      clearApiTokens();
      set({ ...initialState, isLoading: false });
      return;
    }

    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    setApiTokens({ accessToken: token, refreshToken: refreshToken ?? token });

    try {
      const profile = await api.user.profile();
      set((state) => ({
        user: normalizeUser(profile),
        walletAddress: profile.walletAddress ?? null,
        isAuthenticated: true,
        hasBackendSession: true,
        apiSessionVersion: state.apiSessionVersion + 1,
        isLoading: false,
        error: null
      }));
    } catch {
      await get().logout();
    }
  },
  setUser: (user) => {
    set({ user: normalizeUser(user) });
  },
  setWalletAddress: (walletAddress) => {
    set({ walletAddress });
  },
  adultConfirmed: () => {
    set((state) => ({ apiSessionVersion: state.apiSessionVersion + 1 }));
  }
}));
