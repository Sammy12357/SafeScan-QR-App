import { create } from "zustand";
import { AgeChallengeSchema, type AgeChallenge } from "@/utils/schemas";

type AdultChallengeState = {
  challenge: AgeChallenge | null;
  present: (body: unknown) => boolean;
  dismiss: () => void;
};

// Adult verification tickets stay in memory. They are never written to device
// storage or included in navigation URLs.
export const useAdultChallengeStore = create<AdultChallengeState>((set, get) => ({
  challenge: null,
  present: (body) => {
    const result = AgeChallengeSchema.safeParse(body);
    if (!result.success || result.data.minimumAge !== 18) return false;
    if (!get().challenge) set({ challenge: result.data });
    return true;
  },
  dismiss: () => set({ challenge: null })
}));
