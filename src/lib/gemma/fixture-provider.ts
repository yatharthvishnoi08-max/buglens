import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fixtureCases, fixtureAnalyses, type FixtureId } from "../fixtures/data";
import { BugLensError } from "../errors";
import { validateEvidence } from "../validate-evidence";
import { validateImage } from "../image";
import type { VisualProvider } from "./provider";
export const fixtureRoot = () => path.join(process.cwd(), "fixtures", "sample-repo");
export const fixtureImagePath = (id: FixtureId) => path.join(process.cwd(), "fixtures", "screenshots", fixtureCases[id].image);
export function fixtureProvider(id: FixtureId): VisualProvider {
  return { async analyze({ image, context }) {
    const expected = await validateImage(await readFile(fixtureImagePath(id)), "image/png");
    const hash = (data: Uint8Array) => createHash("sha256").update(data).digest("hex");
    if (hash(image.bytes) !== hash(expected.bytes) || JSON.stringify(context) !== JSON.stringify(fixtureCases[id].context)) throw new BugLensError("MODEL_OUTPUT_INVALID", "Synthetic fixture mode only accepts the unchanged selected sample and its context. Select Live Gemma 4 for a custom report.");
    return { analysis: validateEvidence(structuredClone(fixtureAnalyses[id]), context), metadata: { provider: "fixture", model: "none — recorded synthetic evidence", returnedModel: null, fixtureId: id } };
  } };
}
