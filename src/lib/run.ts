import { validateImage } from "./image";
import { reporterContext, validateEvidence } from "./validate-evidence";
import { scanRepository } from "./repository/scan";
import { validatePaths } from "./repository/validate-paths";
import { compileIssue } from "./issue/compile";
import { BugLensResultSchema } from "./schema/result";
import type { VisualProvider } from "./gemma/provider";
export const STAGES = ["Inspecting screenshot", "Validating evidence", "Searching repository", "Verifying file references", "Compiling issue"] as const;
export async function runBugLens(input: { image: Uint8Array; mimeType: string; context: unknown; root: string; provider: VisualProvider; onStage?: (index: number) => void }) {
  const context = reporterContext(input.context);
  const image = await validateImage(input.image, input.mimeType);
  input.onStage?.(0);
  const result = await input.provider.analyze({ image, context });
  input.onStage?.(1);
  const visualAnalysis = validateEvidence(result.analysis, context);
  input.onStage?.(2);
  const repository = await scanRepository(input.root, [context.actualBehavior, context.expectedBehavior, visualAnalysis.summary].join(" "));
  input.onStage?.(3);
  await validatePaths(input.root, repository.matches);
  input.onStage?.(4);
  const compiled = await compileIssue({ visualAnalysis, reporterContext: context, repository, root: input.root, provider: result.metadata.provider });
  return BugLensResultSchema.parse({ visualAnalysis, reporterContext: context, repository, repositoryMatches: repository.matches, ...compiled, metadata: result.metadata, limitations: [...repository.limitations, "Reproduction steps and suggested tests have not been executed.", "Conservative text guards cannot prove that every natural-language visual claim is true. Review the draft before use.", "The hosted demo inspects only the synthetic fixture repository, including for uploaded images."] });
}
