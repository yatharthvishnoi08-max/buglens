import { z } from "zod";
export const EvidenceSourceSchema = z.enum(["visual", "reporter", "repository", "hypothesis", "unknown"]);
export const EvidenceItemSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_-]{0,59}$/), claim: z.string().trim().min(1).max(1000),
  source: EvidenceSourceSchema, evidence: z.string().trim().min(1).max(2000), confidence: z.enum(["high", "medium", "low"]),
}).strict();
export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;
export const ReporterContextSchema = z.object({ expectedBehavior: z.string().trim().min(5).max(2000), actualBehavior: z.string().trim().min(5).max(2000), environment: z.string().trim().max(1000).default("") }).strict();
export type ReporterContext = z.infer<typeof ReporterContextSchema>;
export const VisualAnalysisSchema = z.object({
  status: z.enum(["sufficient", "insufficient"]),
  summary: z.string().trim().min(1).max(400),
  evidence: z.array(EvidenceItemSchema.extend({ source: z.enum(["visual", "reporter", "unknown"]) })).max(20),
  unknowns: z.array(z.string().trim().min(1).max(300)).min(1).max(12),
  forbiddenInferences: z.array(z.string().trim().min(1).max(300)).max(12),
}).strict();
export type VisualAnalysis = z.infer<typeof VisualAnalysisSchema>;
export const RepositoryMatchSchema = z.object({
  path: z.string().min(1).max(300), symbol: z.string().regex(/^[A-Za-z_$][\w$]*$/).optional(),
  matchReason: z.string().min(1).max(500), verified: z.literal(true), relationship: z.enum(["fact", "hypothesis"]),
  line: z.number().int().positive(), excerpt: z.string().max(600), sha256: z.string().regex(/^[a-f0-9]{64}$/), score: z.number().nonnegative(),
  kind: z.enum(["route", "component", "style", "test", "metadata", "source"]),
}).strict();
export type RepositoryMatch = z.infer<typeof RepositoryMatchSchema>;
export const RepositoryReportSchema = z.object({
  matches: z.array(RepositoryMatchSchema).max(12),
  facts: z.array(EvidenceItemSchema.extend({ source: z.literal("repository") })).max(30),
  hypotheses: z.array(EvidenceItemSchema.extend({ source: z.literal("hypothesis") })).max(12),
  searchTerms: z.array(z.string()).max(15), scannedFiles: z.number().int().nonnegative(),
  method: z.enum(["rg", "node"]), limitations: z.array(z.string()).max(10),
}).strict();
export type RepositoryReport = z.infer<typeof RepositoryReportSchema>;
