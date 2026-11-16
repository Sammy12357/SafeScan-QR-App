export function getAuthParam(url: string, key: string): string | null {
  const queryString = url.includes("?") ? url.split("?")[1].split("#")[0] : "";
  const hashString = url.includes("#") ? url.split("#")[1] : "";
  const fragment = new URLSearchParams(hashString);
  // Implicit-flow ID tokens and their state arrive together in the fragment.
  // Never accept state from a separate query string for a fragment token.
  if (fragment.has("id_token") || fragment.has("error")) return fragment.get(key);
  return new URLSearchParams(queryString).get(key) ?? fragment.get(key);
}

export function hasExpectedAuthState(url: string, expectedState: string): boolean {
  return Boolean(expectedState) && getAuthParam(url, "state") === expectedState;
}
