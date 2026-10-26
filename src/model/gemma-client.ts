/** Node/server module. Import only from server code or the local skill runner. */
export const GEMMA_MODEL = "gemma4:31b" as const;
export const GEMMA_ENDPOINT = "https://ollama.com/api/chat";

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

  const apiKey = process.env.OLLAMA_API_KEY?.trim();
  if (!apiKey) {
    throw new GemmaError("API_KEY_REQUIRED", "Set OLLAMA_API_KEY in the server environment.");
  }

  let payload: unknown;
  try {
    const images = parts.flatMap(part => "inlineData" in part ? [part.inlineData.data] : []);
    const response = await fetch(GEMMA_ENDPOINT, {
      method: "POST", redirect: "error", cache: "no-store",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(45_000),
      body: JSON.stringify({
        model: GEMMA_MODEL,
        messages: [{ role: "user", content: parts.flatMap(part => "text" in part ? [part.text] : []).join("\n\n"), ...(images.length ? { images } : {}) }],
        stream: false, think: false, options: { temperature: 0, num_predict: 4096 },
        // Ollama Cloud does not support schema-constrained output. Callers
        // request JSON in the prompt and validate it locally before use.
      }),
    });
    if (!response.ok) {
      await response.body?.cancel();
      const detail = response.status === 429
        ? "Ollama's Gemma 4 rate or usage limit was reached. Wait before retrying and check the Ollama account's usage."
        : response.status === 401 || response.status === 403
          ? "Ollama could not authorize Gemma 4. Check the server API key and account access."
          : `Ollama returned HTTP ${response.status} for Gemma 4.`;
      throw new GemmaError("MODEL_UNAVAILABLE", `${detail} No alternative model or fixture was used.`, response.status);
    }
    payload = await response.json();
  } catch (error) {
    if (error instanceof GemmaError) throw error;
    if (error instanceof SyntaxError) return invalidOutput();
    throw new GemmaError("MODEL_UNAVAILABLE", "The Ollama Gemma 4 request failed or timed out. No alternative model or fixture was used.");
  }
  if (!isObject(payload)) return invalidOutput();

  const modelVersion = payload.model;
  // Preserve an absent model identifier as unknown rather than
  // substituting the requested ID and claiming the server confirmed it.
  if (modelVersion !== undefined && modelVersion !== GEMMA_MODEL) {
    throw new GemmaError("MODEL_NOT_ALLOWED", "The returned model identifier did not match the pinned Gemma model.");
  }

  const message = payload.message;
  if (payload.error || payload.done !== true || payload.done_reason !== "stop" || !isObject(message) || message.role !== "assistant" || typeof message.content !== "string") {
    return invalidOutput();
  }
  if (message.tool_calls !== undefined && (!Array.isArray(message.tool_calls) || message.tool_calls.length > 0)) return invalidOutput();
  const text = message.content.trim();
  if (!text) return invalidOutput();

  return {
    text,
    requestedModel: GEMMA_MODEL,
    returnedModel: typeof modelVersion === "string" ? modelVersion : null,
  };
}
