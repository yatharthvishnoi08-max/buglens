import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateGemma4, GEMMA_ENDPOINT, GEMMA_MODEL } from "../src/model/gemma-client.js";

const fakeKey = "test-only-not-a-real-credential";
const mockFetch = vi.fn<typeof fetch>();

function reply(overrides: Record<string, unknown> = {}) {
  return new Response(JSON.stringify({
    model: GEMMA_MODEL, done: true, done_reason: "stop",
    message: { role: "assistant", content: "OK" },
    ...overrides,
  }), { status: 200 });
}

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
  vi.stubEnv("OLLAMA_API_KEY", fakeKey);
  vi.stubEnv("BUGLENS_GEMMA_MODEL", GEMMA_MODEL);
  vi.stubEnv("GEMMA_MODEL", GEMMA_MODEL);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Gemma 4 only transport", () => {
  it("sends text and inline images only to the pinned Gemma 4 endpoint", async () => {
    mockFetch.mockResolvedValue(reply());
    const parts = [
      { text: "Inspect visible clipping." },
      { inlineData: { mimeType: "image/png" as const, data: "test-base64" } },
    ];
    const result = await generateGemma4(parts);
    expect(result).toEqual({ text: "OK", requestedModel: GEMMA_MODEL, returnedModel: GEMMA_MODEL });
    expect(mockFetch).toHaveBeenCalledExactlyOnceWith(GEMMA_ENDPOINT, expect.objectContaining({
      method: "POST",
      redirect: "error",
      cache: "no-store",
    }));
    const request = mockFetch.mock.calls[0]?.[1];
    expect(new Headers(request?.headers).get("Authorization")).toBe(`Bearer ${fakeKey}`);
    const body = JSON.parse(String(request?.body));
    expect(body.messages).toEqual([{ role: "user", content: "Inspect visible clipping.", images: ["test-base64"] }]);
    expect(body).toMatchObject({ model: GEMMA_MODEL, stream: false, think: false });
    expect(body).not.toHaveProperty("format");
    expect(GEMMA_ENDPOINT).not.toContain(fakeKey);
  });

  it.each(["gemini-flash-latest", "gemini-4-argon", "gemma-3-27b-it", "gemma-4-26b-a4b-it", "gemma4:latest"])(
    "rejects configuration for %s before any request", async (model) => {
      vi.stubEnv("BUGLENS_GEMMA_MODEL", model);
      await expect(generateGemma4([{ text: "OK" }])).rejects.toMatchObject({ code: "MODEL_NOT_ALLOWED" });
      expect(mockFetch).not.toHaveBeenCalled();
    },
  );

  it("does not call the provider with a missing key", async () => {
    vi.stubEnv("OLLAMA_API_KEY", "");
    vi.stubEnv("GEMINI_API_KEY", fakeKey);
    await expect(generateGemma4([{ text: "OK" }])).rejects.toMatchObject({ code: "API_KEY_REQUIRED" });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("refuses browser execution before reading credentials or sending requests", async () => {
    vi.stubGlobal("window", {});
    await expect(generateGemma4([{ text: "OK" }])).rejects.toMatchObject({ code: "SERVER_ONLY" });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it.each([401, 403, 404, 429, 503])("fails HTTP %s without fallback or raw errors", async (status) => {
    mockFetch.mockResolvedValue(new Response(`do not expose ${fakeKey}`, { status }));
    await expect(generateGemma4([{ text: "OK" }])).rejects.toMatchObject({ code: "MODEL_UNAVAILABLE", status });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("suppresses transport errors that might contain credentials", async () => {
    mockFetch.mockRejectedValue(new Error(`do not expose ${fakeKey}`));
    const error = await generateGemma4([{ text: "OK" }]).catch((value: unknown) => value);
    expect(error).toMatchObject({ code: "MODEL_UNAVAILABLE" });
    expect(String(error)).not.toContain(fakeKey);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("rejects a response reporting a different model", async () => {
    mockFetch.mockResolvedValue(reply({ model: "gemini-flash-latest" }));
    await expect(generateGemma4([{ text: "OK" }])).rejects.toMatchObject({ code: "MODEL_NOT_ALLOWED" });
  });

  it("does not invent a returned model identifier if the provider omits it", async () => {
    mockFetch.mockResolvedValue(reply({ model: undefined }));
    expect((await generateGemma4([{ text: "OK" }])).returnedModel).toBeNull();
  });

  it.each([
    { message: undefined },
    { done: false },
    { done_reason: "length" },
    { message: { role: "assistant", thinking: "hidden", content: "" } },
    { message: { role: "user", content: "not assistant output" } },
    { message: { role: "assistant", content: "OK", tool_calls: [{ function: { name: "exec" } }] } },
    { error: "provider rejected request" },
  ])("rejects missing, incomplete, or blocked model output", async (payload) => {
    mockFetch.mockResolvedValue(reply(payload));
    await expect(generateGemma4([{ text: "OK" }])).rejects.toMatchObject({ code: "MODEL_OUTPUT_INVALID" });
  });

  it("rejects malformed provider JSON", async () => {
    mockFetch.mockResolvedValue(new Response("not JSON", { status: 200 }));
    await expect(generateGemma4([{ text: "OK" }])).rejects.toMatchObject({ code: "MODEL_OUTPUT_INVALID" });
  });

  it("uses only final answer text and omits empty image input", async () => {
    mockFetch.mockResolvedValue(reply({ message: { role: "assistant", content: " OK ", thinking: "private reasoning" } }));
    expect((await generateGemma4([{ text: "one" }, { text: "two" }])).text).toBe("OK");
    expect(JSON.parse(String(mockFetch.mock.calls[0]?.[1]?.body)).messages).toEqual([{ role: "user", content: "one\n\ntwo" }]);
  });

  it("identifies an Ollama limit without exposing the upstream body or key", async () => {
    mockFetch.mockResolvedValue(new Response(`secret ${fakeKey}`, { status: 429 }));
    const error = await generateGemma4([{ text: "OK" }]).catch((value: unknown) => value);
    expect(error).toMatchObject({ code: "MODEL_UNAVAILABLE", status: 429 });
    expect(String(error)).toContain("Ollama's Gemma 4 rate or usage limit");
    expect(String(error)).not.toContain(fakeKey);
  });
});
