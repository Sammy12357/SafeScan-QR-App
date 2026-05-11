import { useQuery } from "@tanstack/react-query";
import { fetchAirdropStatus } from "@/services/api";

export function useAirdrop() {
  return useQuery({
    queryKey: ["airdrop-status"],
    queryFn: fetchAirdropStatus
  });
}
