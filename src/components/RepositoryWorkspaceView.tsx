import Link from "next/link";
import type { FormEvent } from "react";
import type { ReporterContext } from "@/lib/schema/evidence";
import type { ProblemInput as Problem } from "@/lib/review/inputs";
import { ProblemInput } from "./ProblemInput";
import { ScreenshotInput } from "./ScreenshotInput";
import { ReporterContextForm } from "./ReporterContextForm";
import { FeedbackBanner } from "./FeedbackBanner";
import { ReviewProgress } from "./ReviewProgress";
import { Icon } from "./Icon";

type Props = {
  url: string; onUrlChange: (value: string) => void;
  mode: "repository" | "problem"; onModeChange: (value: "repository" | "problem") => void;
  problem: Problem; onProblemChange: (value: Problem) => void;
  includeAI: boolean; onAIChange: (value: boolean) => void;
  dependencies: boolean; onDependenciesChange: (value: boolean) => void;
  consent: boolean; onConsentChange: (value: boolean) => void;
  attach: boolean; onAttachChange: (value: boolean) => void;
  preview: string; onFile: (file: File) => void;
  context: ReporterContext; onContextChange: (value: ReporterContext) => void;
  running: boolean; stages: string[]; error: string; onError: (value: string) => void;
  maxUploadMB: number; onSubmit: (event: FormEvent) => void;
};
export function RepositoryWorkspaceView(p: Props) {
  return <main id="main" className="workspace repository-workspace">
    <div className="page-intro"><p className="eyebrow">WORKSPACE / NEW REVIEW</p><h1>Start with your GitHub repository.</h1><p>Review your code, or investigate a problem. Leave with a clear next step.</p></div>
    <div className="workspace-grid">
      <form onSubmit={p.onSubmit} aria-busy={p.running} aria-describedby={p.error ? "review-error" : undefined}>
        <div className="setup-panel">
          <section className="form-section repo-connect" aria-labelledby="repo-heading">
            <div className="section-heading"><span className="section-number">01</span><h2 id="repo-heading">Connect your code</h2><span className="badge neutral">Public repositories</span></div>
            <div className="repo-fields"><label htmlFor="repository-url">Public GitHub repository URL</label>
              <div className="input-with-icon"><Icon name="file" size={18}/><input id="repository-url" type="url" required disabled={p.running} placeholder="https://github.com/owner/repository" value={p.url} onChange={e => p.onUrlChange(e.target.value)} autoComplete="off" spellCheck={false} aria-describedby="repository-help"/></div>
              <p id="repository-help" className="small-note">Read-only snapshot of the default branch. No login or write access.</p>
              <button type="button" className="text-button" disabled={p.running} onClick={() => p.onUrlChange("https://github.com/yatharthvishnoi08-max/buglens")}>Use BugLens’s own repository <Icon name="arrow" size={16}/></button>
            </div>
          </section>
          <section className="form-section" aria-labelledby="scope-heading">
            <div className="section-heading"><span className="section-number">02</span><h2 id="scope-heading">Choose your focus</h2></div>
            <fieldset className="review-modes" disabled={p.running}><legend className="sr-only">Review scope</legend>
              <label className={`mode-card ${p.mode === "repository" ? "selected" : ""}`}><input type="radio" name="review-mode" value="repository" checked={p.mode === "repository"} onChange={() => p.onModeChange("repository")}/><span><strong>Repository-wide review</strong><small>Code health, security, UI and testing gaps.</small></span></label>
              <label className={`mode-card ${p.mode === "problem" ? "selected" : ""}`}><input type="radio" name="review-mode" value="problem" checked={p.mode === "problem"} onChange={() => p.onModeChange("problem")}/><span><strong>Investigate a reported problem</strong><small>Focus the review on a specific symptom.</small></span></label>
            </fieldset>
            <ProblemInput value={p.problem} onChange={p.onProblemChange} disabled={p.running} onError={p.onError}/>
            <label className="screenshot-toggle"><input type="checkbox" checked={p.attach} disabled={p.running} onChange={e => p.onAttachChange(e.target.checked)}/><Icon name="image" size={19}/><span>Add an optional screenshot and reporter context</span></label>
            {p.attach && <div className="input-grid review-image"><ScreenshotInput preview={p.preview} onFile={p.onFile} disabled={p.running} sample={false} maxUploadMB={p.maxUploadMB}/><ReporterContextForm value={p.context} disabled={p.running} onChange={p.onContextChange}/></div>}
          </section>
          <section className="form-section review-options" aria-labelledby="options-heading">
            <div className="section-heading"><span className="section-number">03</span><h2 id="options-heading">Set your checks</h2></div>
            <div className="included-check"><span className="check-icon"><Icon name="check" size={16}/></span><div><strong>Static source checks</strong><small>Included in every review. No AI required.</small></div><span className="badge green">Always on</span></div>
            <label className="analysis-option"><input type="checkbox" checked={p.includeAI} disabled={p.running} onChange={e => p.onAIChange(e.target.checked)}/><span><strong>Gemma 4 source review</strong><small>Gemma 4 reviews selected source excerpts and your evidence. Enabled by default.</small></span><span className="option-tag">Ollama</span></label>
            <label className="analysis-option"><input type="checkbox" checked={p.dependencies} disabled={p.running} onChange={e => p.onDependenciesChange(e.target.checked)}/><span><strong>Known dependency vulnerabilities</strong><small>Advisory checks for up to 200 exact npm versions.</small></span><span className="option-tag">OSV</span></label>
          </section>
          {(p.includeAI || p.dependencies || p.attach) && <section className="privacy-box" aria-labelledby="processing-heading">
            <h2 id="processing-heading">Before you send</h2><p>Selected source and supplied evidence go to Ollama when AI is enabled. Dependency names and versions go to OSV when selected.</p>
            <details><summary>What is shared & retained?</summary><p>Gemma source review sends source excerpts, your description and attached text. Screenshot analysis sends the image and reporter context, even without source review. Common credential patterns are redacted, but not every secret can be detected. Do not submit confidential data. BugLens keeps results in tab memory; refreshing clears them.</p></details>
            <label className="consent"><input type="checkbox" required checked={p.consent} onChange={e => p.onConsentChange(e.target.checked)} disabled={p.running}/><span>I am authorized to review this repository and agree to the selected external processing.</span></label>
          </section>}
          <div className="form-finish">
            {p.error && <FeedbackBanner id="review-error" tone="error" title="The review could not finish"><p>{p.error}</p><p>Your inputs are still here. Adjust the options or try again.</p></FeedbackBanner>}
            <ReviewProgress stages={p.stages} running={p.running} error={Boolean(p.error)}/>
            <div className="submit-row"><span className="small-note"><Icon name="file" size={16}/>Report, documentation & fix prompts</span><button className="button primary" type="submit" disabled={p.running}>{p.running ? <><span className="spinner" aria-hidden="true"/>Reviewing your repository…</> : <>{p.mode === "problem" ? "Investigate problem" : "Analyze repository"}<Icon name="arrow" size={18}/></>}</button></div>
          </div>
        </div>
      </form>
      <aside className="workspace-aside" aria-label="About your review">
        <p className="eyebrow">A CLEAR HANDOFF</p><h2>From code to<br/>your next commit.</h2>
        <ol className="deliverable-list"><li><Icon name="lens"/><div><strong>Find the right starting point</strong><p>Source-linked findings with evidence and uncertainty.</p></div></li><li><Icon name="file"/><div><strong>Take the full picture</strong><p>Download the report and remediation checklist.</p></div></li><li><Icon name="arrow"/><div><strong>Plan a focused fix</strong><p>Copy a prompt into your coding agent to verify, fix and test.</p></div></li></ol>
        <div className="aside-boundary"><Icon name="alert" size={18}/><div><strong>Review, not a guarantee.</strong><p>No repository code or tests are executed. Coverage and unverified work stay visible.</p><Link href="/how-it-works#privacy">Read the limits</Link></div></div>
        <Link href="/demo?sample=clipping" className="sample-link"><span>Just exploring?<strong>Try the synthetic example</strong></span><Icon name="arrow" size={18}/></Link>
      </aside>
    </div>
  </main>;
}
