import { describe, it, expect, vi, afterEach } from "vitest";
import { POST } from "../../src/app/api/analyze-visual/route";
import { sampleContext } from "../../src/lib/fixtures/data";
import { liveProvider } from "../../src/lib/gemma/live-provider";
import { BugLensError } from "../../src/lib/errors";
function form(mode = "fixture") { const body = new FormData(); body.set("mode", mode); body.set("fixtureId", "clipping"); body.set("context", JSON.stringify(sampleContext)); return body; }
afterEach(() => vi.restoreAllMocks());
describe("web request boundaries", () => {
  it("streams genuine stages followed by validated fixture output", async () => {
    const response = await POST(new Request("http://localhost/api/analyze-visual", { method: "POST", body: form() }));
    const events = (await response.text()).trim().split("\n").map((line) => JSON.parse(line));
    expect(events.filter((e) => e.type === "stage").map((e) => e.index)).toEqual([0, 1, 2, 3, 4]);
    expect(events.at(-1).result.validation.valid).toBe(true);
    expect(events.at(-1).result.metadata.provider).toBe("fixture");
  });
  it("rejects a caller-supplied repository path", async () => {
    const body = form(); body.set("repo", "../../secret");
    const response = await POST(new Request("http://localhost/api/analyze-visual", { method: "POST", body }));
    expect((await response.json()).error.code).toBe("UNVERIFIED_FILE_REFERENCE");
  });
  it("rejects cross-origin requests", async () => {
    const response = await POST(new Request("http://localhost/api/analyze-visual", { method: "POST", body: form(), headers: { origin: "https://unrelated.example" } }));
    expect(response.status).toBe(403);
  });
  it("accepts the browser host when Next uses a different internal request URL", async () => {
    const response = await POST(new Request("http://localhost:3000/api/analyze-visual", { method: "POST", body: form(), headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" } }));
    const events = (await response.text()).trim().split("\n").map((line) => JSON.parse(line));
    expect(events.at(-1).type).toBe("result");
  });
  it("requires consent for provider transmission", async () => {
    const request = await POST(new Request("http://localhost/api/analyze-visual", { method: "POST", body: form("live") }));
    expect((await request.json()).error.code).toBe("REPORTER_CONTEXT_REQUIRED");
  });
  it("does not silently replace a failed live request with a fixture", async () => {
    const spy = vi.spyOn(liveProvider, "analyze").mockRejectedValue(new BugLensError("MODEL_UNAVAILABLE", "Unavailable"));
    const body = form("live"); body.set("consent", "yes");
    const response = await POST(new Request("http://localhost/api/analyze-visual", { method: "POST", body }));
    const events = (await response.text()).trim().split("\n").map((line) => JSON.parse(line));
    expect(spy).toHaveBeenCalledOnce(); expect(events.some((e) => e.type === "result")).toBe(false); expect(events.at(-1).error.code).toBe("MODEL_UNAVAILABLE");
  });
});
