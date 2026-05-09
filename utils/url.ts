export function isUrlLike(value: string): boolean {
  return /^https?:\/\//i.test(value.trim()) || /^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(value.trim());
}

export function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("Enter a URL to analyze.");
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function truncateMiddle(value: string, max = 42): string {
  if (value.length <= max) return value;
  const side = Math.floor((max - 3) / 2);
  return `${value.slice(0, side)}...${value.slice(-side)}`;
}
