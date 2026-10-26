import { z } from "zod";
import { VisualAnalysisSchema, ReporterContextSchema, RepositoryReportSchema } from "./evidence";
export const BugLensResultSchema = z.object({
  visualAnalysis: VisualAnalysisSchema,
  reporterContext: ReporterContextSchema,
  repositoryMatches: RepositoryReportSchema.shape.matches,
  repository: RepositoryReportSchema,
  issueMarkdown: z.string().min(1).max(50000),
  validation: z.object({ valid: z.literal(true), errors: z.array(z.string()).length(0) }).strict(),
  metadata: z.object({ provider: z.enum(["gemma", "fixture"]), model: z.string(), returnedModel: z.string().nullable(), fixtureId: z.string().nullable() }).strict(),
  limitations: z.array(z.string()),
}).strict();
export type BugLensResult = z.infer<typeof BugLensResultSchema>;
