"use client";
import { useState, useEffect, useRef, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { fixtureCases, sampleContext, type FixtureId } from "@/lib/fixtures/data";
import { BugLensResultSchema } from "@/lib/schema/result";
import { useReport } from "./ReportSession";
import { DemoWorkspaceView } from "./DemoWorkspaceView";
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
  return <DemoWorkspaceView mode={mode} setMode={setMode} id={id} context={context} setContext={setContext} file={file} preview={preview} consent={consent} setConsent={setConsent} running={running} stage={stage} error={error} selectSample={selectSample} selectFile={selectFile} submit={submit} maxUploadMB={maxUploadMB}/>;
}
