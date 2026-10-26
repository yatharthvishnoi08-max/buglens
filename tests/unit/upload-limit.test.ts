import { afterEach, describe, expect, it, vi } from "vitest";
import { maxUploadBytes } from "../../src/lib/upload-limit";
afterEach(() => vi.unstubAllEnvs());
describe("deployment upload limits", () => {
  it("caps Vercel uploads at 4 MB even when 8 MB is configured", () => {
    vi.stubEnv("VERCEL", "1"); vi.stubEnv("MAX_UPLOAD_MB", "8");
    expect(maxUploadBytes()).toBe(4 * 1024 * 1024);
  });
  it("retains the 8 MB local default", () => {
    vi.stubEnv("VERCEL", ""); vi.stubEnv("MAX_UPLOAD_MB", "8");
    expect(maxUploadBytes()).toBe(8 * 1024 * 1024);
  });
  it("honors a smaller configured limit", () => {
    vi.stubEnv("VERCEL", "1"); vi.stubEnv("MAX_UPLOAD_MB", "2");
    expect(maxUploadBytes()).toBe(2 * 1024 * 1024);
  });
  it("falls back safely when configuration is invalid", () => {
    vi.stubEnv("VERCEL", "1"); vi.stubEnv("MAX_UPLOAD_MB", "NaN");
    expect(maxUploadBytes()).toBe(4 * 1024 * 1024);
  });
});
