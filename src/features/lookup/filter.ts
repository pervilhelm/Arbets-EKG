import type { Finding } from "../../content/schema";

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

/** Matches the query against name and aliases, ignoring case and diacritics (å/ä/ö match a/o). */
export function filterFindings(findings: readonly Finding[], query: string): Finding[] {
  const q = normalize(query.trim());
  if (!q) return [];
  return findings.filter((f) => [f.name, ...f.aliases].some((t) => normalize(t).includes(q)));
}
