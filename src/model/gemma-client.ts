import { GoogleGenAI, ThinkingLevel } from "@google/genai";
/** Node/server module. Import only from server code or the local skill runner. */
export const GEMMA_MODEL = "gemma-4-26b-a4b-it" as const;
export const GEMMA_ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMMA_MODEL}:generateContent`;

export type GemmaPart =
  | { text: string }
  | {
      inlineData: {
        mimeType: "image/png" | "image/jpeg" | "image/webp";
        data: string;
      };
    };

export type GemmaErrorCode =
  | "SERVER_ONLY"
  | "MODEL_NOT_ALLOWED"
  | "API_KEY_REQUIRED"
  | "MODEL_UNAVAILABLE"
  | "MODEL_OUTPUT_INVALID";

export class GemmaError extends Error {
  constructor(
    public readonly code: GemmaErrorCode,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "GemmaError";
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function invalidOutput(): never {
  throw new GemmaError("MODEL_OUTPUT_INVALID", "Gemma returned an invalid response.");
}

/** Transport validation only. Visual-evidence schema validation is a later stage. */
export async function generateGemma4(parts: readonly GemmaPart[]): Promise<{
  text: string;
  requestedModel: typeof GEMMA_MODEL;
  returnedModel: string | null;
}> {
  if (typeof window !== "undefined") {
    throw new GemmaError("SERVER_ONLY", "Gemma calls must run on the server.");
  }

  const configuredModel = process.env.GEMMA_MODEL ?? process.env.BUGLENS_GEMMA_MODEL ?? GEMMA_MODEL;
  if (configuredModel !== GEMMA_MODEL || (process.env.BUGLENS_GEMMA_MODEL && process.env.BUGLENS_GEMMA_MODEL !== GEMMA_MODEL)) {
    throw new GemmaError("MODEL_NOT_ALLOWED", `BugLens is pinned to ${GEMMA_MODEL}.`);
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new GemmaError("API_KEY_REQUIRED", "Set GEMINI_API_KEY in the server environment.");
  }

  let payload: unknown;
  try {
    const client = new GoogleGenAI({ apiKey, vertexai: false, httpOptions: {
      apiVersion: "v1beta", baseUrl: "https://generativelanguage.googleapis.com", timeout: 45_000,
      retryOptions: { attempts: 1 },
      fetch: (input, init) => {
        const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
        if (`${url.origin}${url.pathname}` !== GEMMA_ENDPOINT) throw new Error("Endpoint is not allowed");
        return fetch(input, { ...init, redirect: "error", cache: "no-store" });
      },
    } });
    payload = await client.models.generateContent({
      model: GEMMA_MODEL, contents: [{ role: "user", parts: [...parts] }],
      config: { temperature: 0, maxOutputTokens: 4096, thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL }, abortSignal: AbortSignal.timeout(45_000) },
    });
  } catch (error) {
    if (error instanceof SyntaxError) return invalidOutput();
    const status = isObject(error) && typeof error.status === "number" ? error.status : undefined;
    throw new GemmaError("MODEL_UNAVAILABLE", status ? `Gemma returned HTTP ${status}; no alternative model or fixture was used.` : "The Gemma request failed or timed out.", status);
  }
  if (!isObject(payload)) return invalidOutput();

  const modelVersion = payload.modelVersion;
  // Some responses omit modelVersion. Preserve that as unknown rather than
  // substituting the requested ID and claiming the server confirmed it.
  if (modelVersion !== undefined && modelVersion !== GEMMA_MODEL) {
    throw new GemmaError("MODEL_NOT_ALLOWED", "The returned model identifier did not match the pinned Gemma model.");
  }

  if (isObject(payload.promptFeedback) && payload.promptFeedback.blockReason) {
    return invalidOutput();
  }
  const candidate = Array.isArray(payload.candidates) ? payload.candidates[0] : undefined;
  if (!isObject(candidate) || candidate.finishReason !== "STOP" || !isObject(candidate.content)) {
    return invalidOutput();
  }
  const outputParts = candidate.content.parts;
  if (!Array.isArray(outputParts)) return invalidOutput();
  const text = outputParts
    .filter((part) => isObject(part) && part.thought !== true && typeof part.text === "string")
    .map((part) => (part as { text: string }).text)
    .join("")
    .trim();
  if (!text) return invalidOutput();

  return {
    text,
    requestedModel: GEMMA_MODEL,
    returnedModel: typeof modelVersion === "string" ? modelVersion : null,
  };
}
