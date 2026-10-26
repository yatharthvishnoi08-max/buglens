import { generateGemma4, GemmaError } from "../../model/gemma-client";
import { BugLensError } from "../errors";
import { validateEvidence } from "../validate-evidence";
import { visualPrompt } from "./prompt";
import type { VisualProvider } from "./provider";

export const liveProvider: VisualProvider = { async analyze({ image, context }) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await generateGemma4([
        { inlineData: { mimeType: image.mimeType, data: Buffer.from(image.bytes).toString("base64") } },
        { text: visualPrompt(context, attempt > 0) },
      ]);
      let raw: unknown;
      try { raw = JSON.parse(result.text); } catch { throw new BugLensError("MODEL_OUTPUT_INVALID", "Gemma did not return a JSON object."); }
      return { analysis: validateEvidence(raw, context), metadata: { provider: "gemma", model: result.requestedModel, returnedModel: result.returnedModel, fixtureId: null } };
    } catch (error) {
      const mapped = error instanceof GemmaError ? new BugLensError(error.code === "MODEL_OUTPUT_INVALID" ? "MODEL_OUTPUT_INVALID" : "MODEL_UNAVAILABLE", error.message) : error;
      if (attempt === 0 && mapped instanceof BugLensError && ["MODEL_OUTPUT_INVALID", "HYPOTHESIS_LEAK"].includes(mapped.code)) continue;
      throw mapped;
    }
  }
  throw new BugLensError("MODEL_OUTPUT_INVALID", "Gemma evidence validation failed after one retry.");
} };
