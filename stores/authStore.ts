import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { api, clearApiTokens, setApiTokens, type User } from "@/services/api";
import { roleForEmail } from "@/constants/config";

const AUTH_TOKEN_KEY = "auth_token";
const REFRESH_TOKEN_KEY = "refresh_token";

type AuthState = {
  user: User | null;
  walletAddress: string | null;
  isAuthenticated: boolean;
  // Bumped every time a new backend access token is seeded into the API client.
  // Screens that fetched protected data BEFORE the token arrived watch this and
  // refetch when it changes — that's how we recover from the sign-in race where
  // local auth flips true while exchangeAuth0IdToken is still in flight.
  apiSessionVersion: number;
  hasBackendSession: boolean;
  isLoading: boolean;
  error: string | null;
};

type Auth0UserClaims = {
  sub?: string;
  email?: string;
  name?: string;
  picture?: string;
};

type AuthStore = AuthState & {
  loginWithGoogle: (idToken: string) => Promise<void>;
  loginWithAuth0: (claims: Auth0UserClaims) => void;
  exchangeAuth0IdToken: (idToken: string) => Promise<void>;
  continueAsDemoUser: () => void;
  logout: () => Promise<void>;
  hydrateFromStorage: () => Promise<void>;
  setUser: (user: User) => void;
  setWalletAddress: (walletAddress: string | null) => void;
};

const initialState: AuthState = {
  user: null,
  walletAddress: null,
  isAuthenticated: false,
  apiSessionVersion: 0,
  hasBackendSession: false,
  isLoading: true,
  error: null
};

function normalizeUser(user: User): User {
  return { ...user, role: roleForEmail(user.email) };
}

function decodeIdTokenClaims(idToken: string): Record<string, string | undefined> | null {
  try {
    const b64 = idToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(b64)) as Record<string, string | undefined>;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  ...initialState,
  loginWithAuth0: (claims) => {
    const email = claims.email ?? "";
    set({
      user: normalizeUser({
        id: claims.sub ?? email,
        email,
        name: claims.name ?? (email ? email.split("@")[0] : "SafeScan User"),
        avatarUrl: claims.picture ?? undefined,
        createdAt: new Date().toISOString(),
        role: "user"
      }),
      walletAddress: null,
      isAuthenticated: true,
      isLoading: false,
      error: null
    });
  },
  continueAsDemoUser: () => {
    clearApiTokens();
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
      isLoading: false,
      error: null
    });
  },
  exchangeAuth0IdToken: async (idToken) => {
    // Trade the Auth0-signed idToken for a SafeScan backend session so all
    // require_user endpoints stop 401-ing. Backend dispatches Google vs Auth0
    // by JWT issuer (see hackabull.py /auth/verify).
    try {
      const result = await api.auth.verifyToken(idToken);
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
        apiSessionVersion: state.apiSessionVersion + 1,
        isLoading: false,
        error: null
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "SafeScan backend rejected the Auth0 token.";
      // Don't blow away local identity — useGoogleAuth may decode the idToken
      // claims and call loginWithAuth0 as a fallback so the UI is still usable.
      set({ error: message, hasBackendSession: false });
      throw error;
    }
  },
  loginWithGoogle: async (idToken) => {
    set({ isLoading: true, error: null });
    try {
      const result = await api.auth.verifyToken(idToken);
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
        apiSessionVersion: state.apiSessionVersion + 1,
        isLoading: false,
        error: null
      }));
    } catch (backendError) {
      // Backend is unreachable (Render cold-start, network error, etc.).
      // Decode the Google ID token locally so users can browse without waiting
      // for the backend to wake up.
      const claims = decodeIdTokenClaims(idToken);
      if (claims?.email) {
        set({
          user: normalizeUser({
            id: claims.sub ?? claims.email,
            email: claims.email,
            name: claims.name ?? claims.email.split("@")[0],
            avatarUrl: claims.picture ?? undefined,
            createdAt: new Date().toISOString(),
            role: "user"
          }),
          walletAddress: null,
          isAuthenticated: true,
          hasBackendSession: false,
          isLoading: false,
          error: null
        });
      } else {
        const message = backendError instanceof Error ? backendError.message : "SafeScan sign-in failed.";
        clearApiTokens();
        await Promise.all([
          SecureStore.deleteItemAsync(AUTH_TOKEN_KEY).catch(() => {}),
          SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => {})
        ]);
        set({ ...initialState, isLoading: false, error: message });
        throw backendError;
      }
    }
  },
  logout: async () => {
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
  }
}));
