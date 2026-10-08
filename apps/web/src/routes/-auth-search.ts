export type AuthSearch = { redirect?: string };

export function validateAuthSearch(search: Record<string, unknown>): AuthSearch {
  return typeof search.redirect === "string" ? { redirect: search.redirect } : {};
}
