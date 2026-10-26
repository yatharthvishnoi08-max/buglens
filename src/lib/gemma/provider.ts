import type { VisualAnalysis, ReporterContext } from "../schema/evidence";
import type { ImageType } from "../image";
export type ProviderInput = { image: { bytes: Uint8Array; mimeType: ImageType }; context: ReporterContext };
export type ProviderOutput = { analysis: VisualAnalysis; metadata: { provider: "gemma" | "fixture"; model: string; returnedModel: string | null; fixtureId: string | null } };
export interface VisualProvider { analyze(input: ProviderInput): Promise<ProviderOutput> }
