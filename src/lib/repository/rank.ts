import type { RepositoryMatch } from "../schema/evidence";
const stopWords = new Set(["the", "and", "that", "this", "with", "from", "both", "should", "visible", "unknown", "viewport", "screen", "appears", "without", "behavior", "width", "normal", "right", "side", "extends", "beyond"]);
export function searchTerms(text: string) { return [...new Set(text.toLowerCase().match(/[a-z][a-z0-9]{3,30}/g) ?? [])].filter((t) => !stopWords.has(t)).slice(0, 15); }
export function fileKind(file: string): RepositoryMatch["kind"] {
  if (file === "package.json") return "metadata";
  if (/(test|spec)\.[cm]?[jt]sx?$/.test(file)) return "test";
  if (/\.(css|scss)$/.test(file)) return "style";
  if (/(?:routes?|pages?|app)\//.test(file) || /(?:main|router)\.[jt]sx?$/.test(file)) return "route";
  if (/components?\//.test(file)) return "component";
  return "source";
}
export function rankFile(file: string, content: string, terms: string[]) {
  const pathTerms = terms.filter((term) => file.toLowerCase().includes(term));
  const bodyTerms = terms.filter((term) => content.toLowerCase().includes(term));
  return { score: pathTerms.length * 6 + bodyTerms.length * 2 + (file === "package.json" ? 1 : 0), terms: [...new Set([...pathTerms, ...bodyTerms])] };
}
