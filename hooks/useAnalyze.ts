import { useMutation } from "@tanstack/react-query";
import { analyzeUrl } from "@/services/api";

export function useAnalyze() {
  return useMutation({
    mutationFn: (input: string) => analyzeUrl(input)
  });
}
