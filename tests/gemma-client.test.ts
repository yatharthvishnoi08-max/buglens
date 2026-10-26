import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateGemma4, GEMMA_ENDPOINT, GEMMA_MODEL } from "../src/model/gemma-client.js";

const fakeKey = "test-only-not-a-real-credential";
const mockFetch = vi.fn<typeof fetch>();

function reply(overrides: Record<string, unknown> = {}) {
  return new Response(JSON.stringify({
    modelVersion: GEMMA_MODEL,
    candidates: [{ finishReason: "STOP", content: { parts: [{ text: "OK" }] } }],
    ...overrides,
  }), { status: 200 });
}

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
  vi.stubEnv("GEMINI_API_KEY", fakeKey);
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
    expect(new Headers(request?.headers).get("x-goog-api-key")).toBe(fakeKey);
    expect(JSON.parse(String(request?.body)).contents).toEqual([{ role: "user", parts }]);
    expect(GEMMA_ENDPOINT).not.toContain(fakeKey);
  });

  it.each(["gemini-flash-latest", "gemini-4-argon", "gemma-3-27b-it"])(
    "rejects configuration for %s before any request", async (model) => {
      vi.stubEnv("BUGLENS_GEMMA_MODEL", model);
      await expect(generateGemma4([{ text: "OK" }])).rejects.toMatchObject({ code: "MODEL_NOT_ALLOWED" });
      expect(mockFetch).not.toHaveBeenCalled();
    },
  );

  it("does not call the provider with a missing key", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
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
    mockFetch.mockResolvedValue(reply({ modelVersion: "gemini-flash-latest" }));
    await expect(generateGemma4([{ text: "OK" }])).rejects.toMatchObject({ code: "MODEL_NOT_ALLOWED" });
  });

  it("does not invent a returned model identifier if the provider omits it", async () => {
    mockFetch.mockResolvedValue(reply({ modelVersion: undefined }));
    expect((await generateGemma4([{ text: "OK" }])).returnedModel).toBeNull();
  });

  it.each([
    { candidates: [] },
    { candidates: [{ finishReason: "MAX_TOKENS", content: { parts: [{ text: "partial" }] } }] },
    { candidates: [{ finishReason: "STOP", content: { parts: [{ thought: true, text: "hidden" }] } }] },
    { promptFeedback: { blockReason: "SAFETY" } },
  ])("rejects missing, incomplete, or blocked model output", async (payload) => {
    mockFetch.mockResolvedValue(reply(payload));
    await expect(generateGemma4([{ text: "OK" }])).rejects.toMatchObject({ code: "MODEL_OUTPUT_INVALID" });
  });

  it("rejects malformed provider JSON", async () => {
    mockFetch.mockResolvedValue(new Response("not JSON", { status: 200 }));
    await expect(generateGemma4([{ text: "OK" }])).rejects.toMatchObject({ code: "MODEL_OUTPUT_INVALID" });
  });
});
