"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useReport } from "./ReportSession";
import { ReviewResultSchema } from "@/lib/review/schema";
import { RepositoryWorkspaceView } from "./RepositoryWorkspaceView";
import { problemInput, type ProblemInput as Problem } from "@/lib/review/inputs";

export function RepositoryWorkspace({ maxUploadMB }: { maxUploadMB: number }) {
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<"repository" | "problem">("repository");
  const [problem, setProblem] = useState<Problem>({ text: "", attachments: [] });
  const [includeAI, setIncludeAI] = useState(true), [dependencies, setDependencies] = useState(true), [consent, setConsent] = useState(false);
  const [attach, setAttach] = useState(false), [file, setFile] = useState<File | null>(null), [preview, setPreview] = useState("");
  const [context, setContext] = useState({ expectedBehavior: "", actualBehavior: "", environment: "" });
  const [running, setRunning] = useState(false), [stages, setStages] = useState<string[]>([]), [error, setError] = useState("");
  const owned = useRef(""), handedOff = useRef(false), controller = useRef<AbortController | null>(null);
  const session = useReport(), router = useRouter();
  useEffect(() => () => { controller.current?.abort(); if (!handedOff.current && owned.current) URL.revokeObjectURL(owned.current); }, []);
  function chooseFile(next: File) {
    if (next.size > maxUploadMB * 1024 * 1024) { setError(`Use an image smaller than ${maxUploadMB} MB.`); return; }
    if (!["image/png", "image/jpeg", "image/webp"].includes(next.type)) { setError("Choose a PNG, JPEG or WebP screenshot."); return; }
    if (owned.current) URL.revokeObjectURL(owned.current);
    owned.current = URL.createObjectURL(next); setPreview(owned.current); setFile(next); setError("");
  }
  const withImage = attach;
  async function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    if (withImage && !file) { setError("Attach a screenshot, or choose repository review without a screenshot."); return; }
    try { problemInput(problem); } catch (error) { setError(error instanceof Error ? error.message : "Invalid supporting input."); return; }
    if (mode === "problem" && !withImage && !problem.text.trim() && !problem.attachments.length) { setError("Describe the problem, attach a text file, or add a screenshot."); return; }
    setRunning(true); setStages([]); session.clear(); handedOff.current = false;
    controller.current = new AbortController();
    const form = new FormData(); form.set("options", JSON.stringify({ repositoryUrl: url.trim(), mode, includeAI, checkDependencies: dependencies, consent, problem, ...(withImage ? { context } : {}) }));
    if (withImage && file) form.set("image", file);
    try {
      const response = await fetch("/api/review-repository", { method: "POST", body: form, signal: controller.current.signal });
      if (!response.ok) { const body = await response.json(); throw new Error(body.error?.message ?? "The repository review could not start."); }
      const reader = response.body?.getReader(); if (!reader) throw new Error("The server returned no review stream.");
      const decoder = new TextDecoder(); let buffer = "", received = false;
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true }); const lines = buffer.split("\n"); buffer = lines.pop() ?? "";
        for (const line of lines.filter(Boolean)) {
          const item = JSON.parse(line);
          if (item.type === "stage") setStages(previous => [...previous, item.message]);
          if (item.type === "error") throw new Error(`${item.error.code}: ${item.error.message}${["MODEL_UNAVAILABLE", "MODEL_OUTPUT_INVALID", "API_KEY_REQUIRED"].includes(item.error.code) ? " You can retry later, or turn off Gemma source review and the screenshot option to run static checks only." : ""}`);
          if (item.type === "result") { const result = ReviewResultSchema.parse(item.result); received = true; handedOff.current = withImage; session.setReview(result, withImage ? preview : ""); router.push("/result"); }
        }
      }
      if (!received) throw new Error("The review was interrupted. Retry; no sample output was substituted.");
    } catch (error) { setError(error instanceof Error ? error.message : "The review failed. Please retry."); }
    finally { setRunning(false); }
  }
  return <RepositoryWorkspaceView url={url} onUrlChange={setUrl} mode={mode} onModeChange={setMode} problem={problem} onProblemChange={setProblem} includeAI={includeAI} onAIChange={setIncludeAI} dependencies={dependencies} onDependenciesChange={setDependencies} consent={consent} onConsentChange={setConsent} attach={attach} onAttachChange={setAttach} preview={preview} onFile={chooseFile} context={context} onContextChange={setContext} running={running} stages={stages} error={error} onError={setError} maxUploadMB={maxUploadMB} onSubmit={submit}/>;
}
