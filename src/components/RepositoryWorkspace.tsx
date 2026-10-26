"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useReport } from "./ReportSession";
import { ScreenshotInput } from "./ScreenshotInput";
import { ReporterContextForm } from "./ReporterContextForm";
import { ReviewResultSchema } from "@/lib/review/schema";
import { ProblemInput } from "./ProblemInput";
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
  return <main id="main" className="workspace repository-workspace">
    <div className="page-intro"><p className="eyebrow">YOUR CODE REVIEW WORKSPACE</p><h1>Start with your GitHub repository.</h1><p>One workspace for code health, security, functionality and UI review—or a focused investigation of the problem you provide.</p></div>
    <form onSubmit={submit}>
      <section className="panel repo-connect"><div className="panel-heading"><span className="section-number">01</span><h2>Add your repository</h2><span className="badge green">Read-only</span></div><div className="repo-fields"><label htmlFor="repository-url">Public GitHub repository URL</label><input id="repository-url" type="url" required disabled={running} placeholder="https://github.com/owner/repository" value={url} onChange={e => setUrl(e.target.value)} autoComplete="off"/><p className="small-note">We inspect a fixed commit from the default branch. No write access, login or code execution. Private repositories are not supported yet.</p><button type="button" className="text-button" disabled={running} onClick={() => setUrl("https://github.com/yatharthvishnoi08-max/buglens")}>Use BugLens’s own repository ↗</button></div></section>
      <fieldset className="review-modes" disabled={running}><legend><span className="section-number">02</span> Choose your review</legend><label className={`mode-card ${mode === "repository" ? "selected" : ""}`}><input type="radio" name="review-mode" value="repository" checked={mode === "repository"} onChange={() => setMode("repository")}/><span><strong>Repository-wide review</strong><small>Static code checks, security risks, UI patterns, accessibility and testing gaps.</small></span></label><label className={`mode-card ${mode === "problem" ? "selected" : ""}`}><input type="radio" name="review-mode" value="problem" checked={mode === "problem"} onChange={() => setMode("problem")}/><span><strong>Investigate a reported problem</strong><small>Use your text, logs, code files or screenshot to focus the investigation and fix prompt.</small></span></label></fieldset>
      <ProblemInput value={problem} onChange={setProblem} disabled={running} onError={setError}/>
      <section className="panel review-options"><h2>Analysis options</h2><label className="consent"><input type="checkbox" checked={includeAI} disabled={running} onChange={e => setIncludeAI(e.target.checked)}/><span><strong>Gemma 4 source review</strong><small>Review selected, redacted source excerpts and your supplied evidence. Static rules still run across all included files.</small></span></label><label className="consent"><input type="checkbox" checked={dependencies} disabled={running} onChange={e => setDependencies(e.target.checked)}/><span><strong>Known dependency vulnerabilities</strong><small>Compare up to 200 exact npm lockfile versions with OSV advisories.</small></span></label><label className="consent"><input type="checkbox" checked={attach} disabled={running} onChange={e => setAttach(e.target.checked)}/>Add an optional screenshot and reporter context</label></section>
      {withImage && <div className="input-grid review-image"><ScreenshotInput preview={preview} onFile={chooseFile} disabled={running} sample={false} maxUploadMB={maxUploadMB}/><ReporterContextForm value={context} disabled={running} onChange={setContext}/></div>}
      <section className="review-boundary"><strong>A source review, not a claim that everything was tested.</strong><p>We do not run this repository, its tests, or a browser against it. Findings are review leads. The report shows excluded files, analysis limits and runtime checks still needed.</p></section>
      {(includeAI || dependencies || withImage) && <div className="privacy-box"><div><strong>External processing</strong><p>Gemma review sends selected source excerpts, your description and attached text to Google. Screenshots and reporter context are also sent if attached. Dependency checks send package names and versions to OSV. Common credential patterns are redacted, but redaction is not exhaustive. Only review code you are authorized to share; do not upload secrets or confidential screenshots.</p><label className="consent"><input type="checkbox" required checked={consent} onChange={e => setConsent(e.target.checked)} disabled={running}/>I am authorized to review this repository and agree to the selected external processing.</label></div></div>}
      {error && <div className="error-box" role="alert"><p>{error}</p></div>}
      <div className="submit-row"><p>Your output: findings, a report, documentation<br/><span>and exact prompts to paste into a coding agent.</span></p><button className="button primary" type="submit" disabled={running}>{running ? "Reviewing your repository…" : mode === "problem" ? "Investigate problem" : "Analyze repository"}</button></div>
      {stages.length > 0 && <section className="panel processing" aria-live="polite"><h2>{running ? "Review in progress" : error ? "Review stopped" : "Review complete"}</h2><ol>{stages.map((stage, i) => <li key={i}><span className="step-dot">{i + 1}</span>{stage}</li>)}</ol></section>}
    </form><p className="legacy-link">Want a quick example first? <Link href="/demo?sample=clipping">Open the clearly labeled synthetic screenshot demo →</Link></p>
  </main>;
}
