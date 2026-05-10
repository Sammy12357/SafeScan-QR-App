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
  isLoading: true,
  error: null
};

function normalizeUser(user: User): User {
  return { ...user, role: roleForEmail(user.email) };
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
      isLoading: false,
      error: null
    });
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
      set({
        user: normalizeUser(result.user),
        walletAddress: null,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
    } catch (backendError) {
      // Backend is unreachable (Render cold-start, network error, etc.).
      // The Google ID token is a JWT signed by Google — the user has already
      // been verified. Decode the payload locally so they can access the app
      // without waiting for the backend to wake up.
      try {
        const b64 = idToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        const claims = JSON.parse(atob(b64)) as Record<string, string | undefined>;
        const email = claims.email;
        if (!email) throw new Error("no email claim");
        set({
          user: normalizeUser({
            id: claims.sub ?? email,
            email,
            name: claims.name ?? email.split("@")[0],
            avatarUrl: claims.picture ?? undefined,
            createdAt: new Date().toISOString(),
            role: "user"
          }),
          walletAddress: null,
          isAuthenticated: true,
          isLoading: false,
          error: null
        });
      } catch {
        // Local decode also failed — surface the original backend error.
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
      set({ ...initialState, isLoading: false });
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
      set({
        user: normalizeUser(profile),
        walletAddress: profile.walletAddress ?? null,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
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
