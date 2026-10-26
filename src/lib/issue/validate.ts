import { BugLensError } from "../errors";
import { validatePaths } from "../repository/validate-paths";
import type { RepositoryMatch } from "../schema/evidence";
export const ISSUE_SECTIONS = ["Observed visual evidence", "Reporter-provided facts", "Verified repository context", "Suspected causes — not verified", "Unknown information", "Reproduction steps", "Acceptance criteria", "Suggested verification", "Evidence provenance"] as const;
export async function validateIssue(markdown: string, canonical: string, root: string, matches: RepositoryMatch[]) {
  await validatePaths(root, matches);
  const headings = [...markdown.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
  if (JSON.stringify(headings) !== JSON.stringify(ISSUE_SECTIONS)) throw new BugLensError("COMPILATION_FAILED", "The issue is missing a required section or its section order changed.");
  const known = new Set(matches.map((m) => m.path));
  const references = markdown.match(/\b(?:[\w@.-]+\/)*[\w.-]+\.(?:tsx?|jsx?|css|scss|json|html|vue|svelte|py|md)\b/g) ?? [];
  for (const reference of references) if (!known.has(reference)) throw new BugLensError("UNVERIFIED_FILE_REFERENCE", `The issue refers to an unverified file: ${reference}`);
  if (markdown !== canonical) throw new BugLensError("COMPILATION_FAILED", "The issue differs from the validated evidence. Recompile it rather than editing factual sections directly.");
  return { valid: true as const, errors: [] as string[] };
}
