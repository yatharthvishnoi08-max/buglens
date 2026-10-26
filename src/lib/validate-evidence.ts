import { BugLensError } from "./errors";
import { ReporterContextSchema, VisualAnalysisSchema, type ReporterContext, type VisualAnalysis } from "./schema/evidence";

// Conservative, inspectable guards. They reject common unsupported claims; they
// are not a proof that arbitrary natural-language assertions are visually true.
const implementation = /\b(css|html|dom|flex(?:box|[- ]?wrap|[- ]?shrink)?|nowrap|grid-template|overflow-x|min-width|max-width|margin|padding|z-index|stylesheet|component|className|position:\s*\w+|root cause|caused by|because|due to|responsible for|likely|probably|might|may be|could be)\b/i;
const environment = /\b(chrome|safari|firefox|edge browser|android|ios|macos|windows|linux|browser version|device.pixel.ratio|viewport|\d+\s*(?:px|pixels?|×|x\s*\d))\b/i;
const fileReference = /(?:[\w@.-]+\/)+[\w.-]+\.(?:tsx?|jsx?|css|scss|json|html|vue|svelte|py|md)\b/i;
export function reporterContext(value: unknown): ReporterContext {
  const parsed = ReporterContextSchema.safeParse(value);
  if (!parsed.success) throw new BugLensError("REPORTER_CONTEXT_REQUIRED", "Supply expected and actual behavior (5–2,000 characters each) and optional environment context.");
  return parsed.data;
}
export function assertVisualClaim(text: string) {
  if (implementation.test(text) || environment.test(text) || fileReference.test(text)) {
    throw new BugLensError("HYPOTHESIS_LEAK", "Visual evidence contains an implementation, environment, or causal inference. Revise the observation and retry.");
  }
}
export function validateEvidence(value: unknown, rawContext: unknown): VisualAnalysis {
  const context = reporterContext(rawContext);
  const parsed = VisualAnalysisSchema.safeParse(value);
  if (!parsed.success) {
    if (value && typeof value === "object" && "evidence" in value && Array.isArray(value.evidence) && value.evidence.some((item: unknown) => item && typeof item === "object" && "source" in item && ["hypothesis", "repository"].includes(String(item.source)))) {
      throw new BugLensError("HYPOTHESIS_LEAK", "The visual extractor cannot supply repository facts or hypotheses.");
    }
    throw new BugLensError("MODEL_OUTPUT_INVALID", "The model response did not match the strict evidence schema.");
  }
  const analysis = parsed.data;
  if (analysis.status === "insufficient" || !analysis.evidence.some((e) => e.source === "visual")) throw new BugLensError("INSUFFICIENT_VISUAL_EVIDENCE", "The image does not provide enough clear visual evidence. Supply a sharper screenshot showing the reported symptom.");
  const ids = new Set<string>();
  for (const item of analysis.evidence) {
    if (ids.has(item.id)) throw new BugLensError("MODEL_OUTPUT_INVALID", "Evidence identifiers must be unique.");
    ids.add(item.id);
    if (item.source === "visual") { assertVisualClaim(item.claim); assertVisualClaim(item.evidence); }
    if (item.source === "reporter" && (item.claim !== item.evidence || !Object.values(context).some((text) => text.includes(item.claim)))) {
      throw new BugLensError("MODEL_OUTPUT_INVALID", "Reporter evidence must quote supplied context exactly.");
    }
  }
  assertVisualClaim(analysis.summary);
  // Canonical reporter items prevent a model from silently dropping statements.
  const evidence = analysis.evidence.filter((e) => e.source !== "reporter").map((e, i) => ({ ...e, id: `observation_${i + 1}` }));
  for (const [field, claim] of Object.entries(context)) if (claim) evidence.push({ id: `reporter_${field.toLowerCase()}`, claim, evidence: claim, source: "reporter", confidence: "high" });
  return VisualAnalysisSchema.parse({ ...analysis, evidence, unknowns: [...new Set([...analysis.unknowns, "Whether a candidate source file caused the visible symptom"])].slice(0, 12) });
}
