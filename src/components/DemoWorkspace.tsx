"use client";
import { useState, useEffect, useRef, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { fixtureCases, sampleContext, type FixtureId } from "@/lib/fixtures/data";
import { BugLensResultSchema } from "@/lib/schema/result";
import { ReporterContextForm } from "./ReporterContextForm";
import { ScreenshotInput } from "./ScreenshotInput";
import { ProcessingSteps } from "./ProcessingSteps";
import { useReport } from "./ReportSession";
import { Icon } from "./Icon";
export function DemoWorkspace({ initialSample, defaultMode, maxUploadMB }: { initialSample: boolean; defaultMode: "fixture" | "live"; maxUploadMB: number }) {
  const router = useRouter(); const session = useReport();
  const [mode, setMode] = useState<"fixture" | "live">(initialSample ? defaultMode : "live");
  const [id, setId] = useState<FixtureId>("clipping");
  const [context, setContext] = useState(initialSample ? { ...sampleContext } : { expectedBehavior: "", actualBehavior: "", environment: "" });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(initialSample ? "/api/sample-image?id=clipping" : "");
  const [consent, setConsent] = useState(false); const [running, setRunning] = useState(false); const [stage, setStage] = useState(-1);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const ownedBlob = useRef(""); const handedOff = useRef(false); const controller = useRef<AbortController | null>(null);
  useEffect(() => () => { controller.current?.abort(); if (ownedBlob.current && !handedOff.current) URL.revokeObjectURL(ownedBlob.current); }, []);
  function selectSample(next: FixtureId) { if (ownedBlob.current) URL.revokeObjectURL(ownedBlob.current); ownedBlob.current = ""; setId(next); setFile(null); setPreview(`/api/sample-image?id=${next}`); setContext({ ...fixtureCases[next].context }); setError(null); }
  function selectFile(next: File) {
    if (next.size > maxUploadMB * 1024 * 1024) { setError({ code: "IMAGE_TOO_LARGE", message: `Choose an image smaller than ${maxUploadMB} MB.` }); return; }
    if (!["image/png", "image/jpeg", "image/webp"].includes(next.type)) { setError({ code: "INVALID_IMAGE", message: "Choose a PNG, JPEG or WebP screenshot." }); return; }
    if (ownedBlob.current) URL.revokeObjectURL(ownedBlob.current);
    const url = URL.createObjectURL(next); ownedBlob.current = url; setFile(next); setPreview(url); setMode("live"); setError(null);
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!preview) { setError({ code: "INVALID_IMAGE", message: "Choose a screenshot or select the synthetic sample." }); return; }
    setRunning(true); setStage(0); setError(null); session.clear(); handedOff.current = false;
    const body = new FormData(); body.set("mode", mode); body.set("fixtureId", id); body.set("context", JSON.stringify(context)); body.set("consent", consent ? "yes" : "no"); if (file) body.set("image", file);
    controller.current = new AbortController();
    try {
      const response = await fetch("/api/analyze-visual", { method: "POST", body, signal: controller.current.signal });
      if (!response.ok) { const value = await response.json(); setError(value.error ?? { code: "COMPILATION_FAILED", message: "The request failed." }); return; }
      const reader = response.body?.getReader(); if (!reader) throw new Error("No response");
      const decoder = new TextDecoder(); let buffer = "", received = false;
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n"); buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line) continue; const data = JSON.parse(line);
          if (data.type === "stage") setStage(data.index);
          if (data.type === "error") { setError(data.error); received = true; }
          if (data.type === "result") { const result = BugLensResultSchema.parse(data.result); received = true; handedOff.current = true; setStage(5); session.setReport(result, preview); router.push("/result"); }
        }
      }
      if (!received) throw new Error("Incomplete response");
    } catch { setError({ code: "COMPILATION_FAILED", message: "The connection or response validation failed. Please retry; no issue has been published." }); }
    finally { setRunning(false); }
  }
  return <main id="main" className="workspace"><div className="page-intro"><p className="eyebrow">BUG REPORT WORKSPACE</p><h1>Start with what you can see.</h1><p>Add the visual symptom and the context you know. We’ll keep the evidence separate.</p></div><form onSubmit={submit}>
    <div className="mode-bar"><div><label htmlFor="provider">Analysis provider</label><select id="provider" value={mode} disabled={running} onChange={(e) => setMode(e.target.value as "fixture" | "live")}><option value="fixture">Synthetic fixture mode</option><option value="live">Live Gemma 4</option></select></div><span className={`badge ${mode === "fixture" ? "amber" : "green"}`}><span aria-hidden="true">●</span> {mode === "fixture" ? "Synthetic fixture mode" : "Live Gemma 4"}</span><p>{mode === "fixture" ? "Recorded evidence. No model call. Use an unchanged sample." : "Image + reporter context are sent to Google’s Gemini API."}</p></div>
    <div className="sample-bar"><label htmlFor="sample">Synthetic sample</label><select id="sample" value={preview && !file ? id : ""} disabled={running} onChange={(e) => { if (e.target.value) selectSample(e.target.value as FixtureId); }}><option value="" disabled>Select a sample</option>{Object.entries(fixtureCases).map(([key, value]) => <option key={key} value={key}>{value.name}</option>)}</select><button type="button" className="text-button" disabled={running} onClick={() => selectSample("clipping")}>Reset to sample ↺</button></div>
    <div className="input-grid"><ScreenshotInput preview={preview} onFile={selectFile} disabled={running} sample={!file} maxUploadMB={maxUploadMB}/><ReporterContextForm value={context} disabled={running || mode === "fixture"} onChange={setContext}/></div>
    <div className="repository-strip"><span className="section-number">03</span><Icon name="file"/><div><strong>Repository: synthetic checkout</strong><p>React fixture · routes, components, styles and tests. The web demo always searches this bundled repository.</p></div><span className="badge neutral">Read-only</span></div>
    <div className="privacy-box"><Icon name="alert"/><div><strong>Keep sensitive data out of screenshots.</strong><p>Do not upload secrets, access tokens, customer data, confidential interfaces or identifiable people. BugLens does not persist uploads. Live analysis is processed by Google under its API terms.</p>{mode === "live" && <label className="consent"><input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} disabled={running}/> I agree to send this image and reporter context to Google for analysis.</label>}</div></div>
    {error && <div className="error-box" role="alert"><Icon name="alert"/><div><strong>{error.code}</strong><p>{error.message}</p></div></div>}
    <div className="submit-row"><p>A draft for you to review.<br/><span>No code changes or issue publishing.</span></p><button className="button primary" disabled={running} type="submit">{running ? "Building the issue…" : "Generate issue draft"}<Icon name="arrow"/></button></div>
    {stage >= 0 && <ProcessingSteps stage={stage} failed={Boolean(error)}/>}
  </form></main>;
}
