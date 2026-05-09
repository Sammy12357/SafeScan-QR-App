import { create } from "zustand";
import type { AnalyzeResponse } from "@/services/api";

export type ScanRecord = AnalyzeResponse & {
  id: string;
};

type ScanStore = {
  currentScan: ScanRecord | null;
  history: ScanRecord[];
  setCurrentScan: (scan: ScanRecord) => void;
  addScan: (scan: ScanRecord) => void;
  clearHistory: () => void;
};

export const useScanStore = create<ScanStore>((set) => ({
  currentScan: null,
  history: [],
  setCurrentScan: (scan) => set({ currentScan: scan }),
  addScan: (scan) =>
    set((state) => ({
      currentScan: scan,
      history: [scan, ...state.history.filter((item) => item.id !== scan.id)].slice(0, 20)
    })),
  clearHistory: () => set({ currentScan: null, history: [] })
}));
