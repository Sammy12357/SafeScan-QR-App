import { create } from "zustand";
import { api, type AirdropStatus, type ReferralStats } from "@/services/api";

type AirdropStore = {
  status: AirdropStatus | null;
  referral: ReferralStats | null;
  isLoading: boolean;
  error: string | null;
  fetchStatus: () => Promise<void>;
  claimReferral: () => Promise<{ message: string }>;
};

export const useAirdropStore = create<AirdropStore>((set) => ({
  status: null,
  referral: null,
  isLoading: false,
  error: null,
  fetchStatus: async () => {
    set({ isLoading: true, error: null });
    try {
      const [status, referral] = await Promise.all([api.airdrop.status(), api.referral.stats()]);
      set({ status, referral, isLoading: false, error: null });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Could not load airdrop status."
      });
    }
  },
  claimReferral: async () => ({ message: "Referral claiming is coming soon." })
}));
