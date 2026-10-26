import { z } from "zod";
import { runRepositoryReview } from "@/lib/review/run";
import { maxUploadBytes } from "@/lib/upload-limit";
import { BugLensError, publicError } from "@/lib/errors";
import { GemmaError } from "@/model/gemma-client";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;
const Options = z.object({ repositoryUrl: z.string().max(250), mode: z.enum(["repository", "problem"]), includeAI: z.boolean(), checkDependencies: z.boolean(), consent: z.boolean(), context: z.unknown().optional(), problem: z.unknown().optional() }).strict();
export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin"), host = request.headers.get("host") ?? new URL(request.url).host;
    if (origin && new URL(origin).host !== host) return Response.json({ error: { code: "REPOSITORY_UNAVAILABLE", message: "Submit this review from the BugLens website." } }, { status: 403 });
    const reader = request.body?.getReader(); if (!reader) throw new BugLensError("REPOSITORY_UNAVAILABLE", "Supply review options.");
    let total = 0; const chunks: Uint8Array[] = [], limit = maxUploadBytes() + 200_000;
    while (true) { const { done, value } = await reader.read(); if (done) break; total += value.length; if (total > limit) { await reader.cancel(); throw new BugLensError("IMAGE_TOO_LARGE", "The screenshot exceeds this deployment's upload limit."); } chunks.push(value); }
    let form: FormData; try { form = await new Response(Buffer.concat(chunks), { headers: { "Content-Type": request.headers.get("content-type") ?? "" } }).formData(); } catch { throw new BugLensError("REPOSITORY_UNAVAILABLE", "Supply a multipart review request."); }
    for (const key of form.keys()) if (!["options", "image"].includes(key)) throw new BugLensError("REPOSITORY_UNAVAILABLE", "Unexpected review field.");
    if (form.getAll("options").length !== 1 || form.getAll("image").length > 1 || (form.has("image") && !(form.get("image") instanceof File))) throw new BugLensError("REPOSITORY_UNAVAILABLE", "Supply one options object and at most one screenshot.");
    let raw: unknown; try { raw = JSON.parse(String(form.get("options"))); } catch { throw new BugLensError("REPOSITORY_UNAVAILABLE", "Supply valid review options."); }
    const parsed = Options.safeParse(raw); if (!parsed.success) throw new BugLensError("REPOSITORY_UNAVAILABLE", "Review options are missing or invalid.");
    const options = parsed.data, upload = form.get("image");
    if ((options.includeAI || options.checkDependencies || upload instanceof File) && !options.consent) throw new BugLensError("REPORTER_CONTEXT_REQUIRED", "Confirm the external processing notice before using Gemma or dependency advisories.");
    const image = upload instanceof File ? { bytes: new Uint8Array(await upload.arrayBuffer()), mimeType: upload.type } : undefined;
    const encoder = new TextEncoder(); let closed = false;
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: unknown) => { if (!closed) controller.enqueue(encoder.encode(JSON.stringify(data) + "\n")); };
        try { const result = await runRepositoryReview({ ...options, image, onStage: message => send({ type: "stage", message }) }); send({ type: "result", result }); }
        catch (error) { send({ type: "error", error: error instanceof GemmaError ? { code: error.code, message: error.message } : publicError(error) }); }
        finally { if (!closed) controller.close(); }
      }, cancel() { closed = true; },
    });
    return new Response(stream, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) { return Response.json({ error: publicError(error) }, { status: error instanceof BugLensError && error.code === "IMAGE_TOO_LARGE" ? 413 : 400 }); }
}
