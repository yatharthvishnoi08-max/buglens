import { z } from "zod";
import { VisualAnalysisSchema } from "../schema/evidence";
import { ProblemInputSchema } from "./inputs";

export const FindingSchema = z.object({
  id: z.string(), title: z.string().min(1).max(180),
  category: z.enum(["security", "functionality", "ui", "accessibility", "testing", "maintainability"]),
  severity: z.enum(["high", "medium", "low", "info"]),
  source: z.enum(["static-rule", "gemma", "osv"]),
  path: z.string(), line: z.number().int().positive(), evidence: z.string().max(900),
  explanation: z.string().max(2000), recommendation: z.string().max(1600), verification: z.string().max(1200),
  confidence: z.enum(["high", "medium", "low"]), status: z.literal("needs-verification"),
  fixPrompt: z.string(),
  focus: z.enum(["reported-problem", "repository-review"]).default("repository-review"),
}).strict();
export type Finding = z.infer<typeof FindingSchema>;
export type SourceFile = { path: string; content: string; sha256: string };
export type Snapshot = {
  repository: { owner: string; name: string; url: string; commit: string; branch: string };
  files: SourceFile[]; totalFiles: number; eligibleFiles: number; skippedFiles: number;
  sensitivePaths: string[]; truncated: boolean; bytes: number;
  importNote?: string;
};
export const ReviewResultSchema = z.object({
  kind: z.literal("repository-review"),
  repository: z.object({ owner: z.string(), name: z.string(), url: z.string().url(), commit: z.string(), branch: z.string() }),
  mode: z.enum(["repository", "problem"]), createdAt: z.string(), summary: z.string(),
  reportedProblem: ProblemInputSchema,
  findings: z.array(FindingSchema).max(100),
  coverage: z.object({ totalFiles: z.number(), eligibleFiles: z.number(), scannedFiles: z.number(), skippedFiles: z.number(), bytes: z.number(), truncated: z.boolean(), aiFiles: z.array(z.string()), dependencyPackages: z.number(), dependencyStatus: z.enum(["checked", "not-requested", "no-supported-lockfile", "unavailable"]) }),
  checks: z.array(z.object({ category: z.string(), status: z.enum(["reviewed", "limited", "not-run"]), detail: z.string() })),
  visualAnalysis: VisualAnalysisSchema.nullable(),
  screenshotMatches: z.array(z.object({ path: z.string(), reason: z.string() })),
  metadata: z.object({ provider: z.enum(["gemma", "static"]), model: z.string().nullable(), returnedModel: z.string().nullable() }),
  warnings: z.array(z.string()), reportMarkdown: z.string(), documentationMarkdown: z.string(), fixPrompt: z.string(),
  validation: z.object({ valid: z.literal(true), runtimeVerified: z.literal(false) }),
}).strict();
export type ReviewResult = z.infer<typeof ReviewResultSchema>;
