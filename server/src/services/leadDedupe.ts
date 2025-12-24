export function buildLeadDedupeFilters(email?: string | null, phone?: string | null) {
  const filters: Array<Record<string, string>> = [];
  if (email) filters.push({ email });
  if (phone) filters.push({ phone });
  return filters;
}
