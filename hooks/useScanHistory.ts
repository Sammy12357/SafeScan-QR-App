import { useScanStore } from "@/stores/scanStore";

export function useScanHistory() {
  return useScanStore((state) => state.history);
}
