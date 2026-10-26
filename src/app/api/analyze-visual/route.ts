import { readFile } from "node:fs/promises";
import { BugLensError, publicError } from "@/lib/errors";
import { maxUploadBytes } from "@/lib/image";
import { fixtureCases, type FixtureId } from "@/lib/fixtures/data";
import { fixtureProvider, fixtureRoot, fixtureImagePath } from "@/lib/gemma/fixture-provider";
import { liveProvider } from "@/lib/gemma/live-provider";
import { runBugLens } from "@/lib/run";
import { reporterContext } from "@/lib/validate-evidence";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

async function boundedForm(request: Request) {
  const limit = maxUploadBytes() + 100_000;
  if (Number(request.headers.get("content-length")) > limit) throw new BugLensError("IMAGE_TOO_LARGE", "The upload exceeds the configured image size limit.");
  const reader = request.body?.getReader();
  if (!reader) throw new BugLensError("INVALID_IMAGE", "Supply a screenshot or select a synthetic sample.");
  let total = 0;
  const chunks: Uint8Array[] = [];
  while (true) { const { value, done } = await reader.read(); if (done) break; total += value.byteLength; if (total > limit) { await reader.cancel(); throw new BugLensError("IMAGE_TOO_LARGE", "The upload exceeds the configured image size limit."); } chunks.push(value); }
  try { return await new Response(Buffer.concat(chunks), { headers: { "Content-Type": request.headers.get("content-type") ?? "" } }).formData(); }
  catch { throw new BugLensError("INVALID_IMAGE", "Expected a multipart screenshot submission."); }
}
export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host") ?? new URL(request.url).host;
    if (origin && (new URL(origin).host !== host || !["http:", "https:"].includes(new URL(origin).protocol))) return Response.json({ error: { code: "MODEL_UNAVAILABLE", message: "Submit this form from the BugLens website." } }, { status: 403 });
    const form = await boundedForm(request);
    const allowed = new Set(["image", "context", "mode", "fixtureId", "consent"]);
    for (const key of form.keys()) if (!allowed.has(key)) throw new BugLensError("UNVERIFIED_FILE_REFERENCE", "The website can inspect only the bundled synthetic repository.");
    const mode = form.get("mode");
    if (mode !== "fixture" && mode !== "live") throw new BugLensError("MODEL_UNAVAILABLE", "Select Live Gemma 4 or Synthetic fixture mode.");
    const fixtureId = String(form.get("fixtureId") ?? "clipping") as FixtureId;
    if (!Object.hasOwn(fixtureCases, fixtureId)) throw new BugLensError("INVALID_IMAGE", "Unknown synthetic sample.");
    let rawContext: unknown;
    try { rawContext = JSON.parse(String(form.get("context"))); } catch { throw new BugLensError("REPORTER_CONTEXT_REQUIRED", "Supply valid reporter context."); }
    const context = reporterContext(rawContext);
    if (mode === "live" && form.get("consent") !== "yes") throw new BugLensError("REPORTER_CONTEXT_REQUIRED", "Confirm that the image and reporter context may be sent to Google's Gemini API.");
    const upload = form.get("image");
    const image = upload instanceof File ? new Uint8Array(await upload.arrayBuffer()) : await readFile(fixtureImagePath(fixtureId));
    const mimeType = upload instanceof File ? upload.type : "image/png";
    const encoder = new TextEncoder();
    let closed = false;
    const stream = new ReadableStream({
      async start(controller) {
        const send = (value: unknown) => { if (!closed) controller.enqueue(encoder.encode(JSON.stringify(value) + "\n")); };
        try {
          const result = await runBugLens({ image, mimeType, context, root: fixtureRoot(), provider: mode === "live" ? liveProvider : fixtureProvider(fixtureId), onStage: (index) => send({ type: "stage", index }) });
          send({ type: "result", result });
        } catch (error) { send({ type: "error", error: publicError(error) }); }
        finally { if (!closed) controller.close(); }
      },
      cancel() { closed = true; },
    });
    return new Response(stream, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) { return Response.json({ error: publicError(error) }, { status: error instanceof BugLensError && error.code === "IMAGE_TOO_LARGE" ? 413 : 400 }); }
}
