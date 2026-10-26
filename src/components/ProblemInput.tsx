"use client";
import { Icon } from "./Icon";
import { TEXT_FILE_ACCEPT, problemInput, type ProblemInput as Problem } from "@/lib/review/inputs";
export function ProblemInput({ value, onChange, disabled, onError }: { value: Problem; onChange: (value: Problem) => void; disabled: boolean; onError: (message: string) => void }) {
  async function filesSelected(files: FileList | null) {
    if (!files) return;
    try {
      const attachments = [...value.attachments];
      for (const file of Array.from(files)) {
        if (file.size > 80000) throw new Error(`${file.name}: keep text files below 80 KB and 20,000 characters.`);
        const text = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
        attachments.push({ name: file.name, text });
      }
      onChange(problemInput({ ...value, attachments })); onError("");
    } catch (error) { onError(error instanceof Error ? error.message : "The text file could not be read."); }
  }
  return <ProblemInputView value={value} onChange={onChange} disabled={disabled} onFilesSelected={filesSelected}/>;
}
function ProblemInputView({ value, onChange, disabled, onFilesSelected }: { value: Problem; onChange: (value: Problem) => void; disabled: boolean; onFilesSelected: (files: FileList | null) => Promise<void> }) {
  return <section className="problem-input" aria-label="Problem description and supporting evidence">
    <div className="input-label-row"><label htmlFor="problem-text">Paste a description, error, stack trace, logs or code</label><span>Optional for broad review</span></div>
    <textarea id="problem-text" rows={4} maxLength={20000} value={value.text} disabled={disabled} onChange={e => onChange({ ...value, text: e.target.value })} placeholder="What is failing? What should happen? Add the error or steps to reproduce." aria-describedby="problem-help"/>
    <div className="input-support"><label className={`button secondary text-upload ${disabled ? "is-disabled" : ""}`}><Icon name="file" size={16}/>Attach text or code files<input type="file" multiple accept={TEXT_FILE_ACCEPT} disabled={disabled} aria-label="Attach supporting text files" aria-describedby="problem-help" onChange={e => { void onFilesSelected(e.target.files); e.target.value = ""; }}/></label><span className="small-note">{value.attachments.length} / 3 files</span></div>
    {value.attachments.length > 0 && <ul className="attachment-list">{value.attachments.map((file, i) => <li key={`${file.name}-${i}`}><span>{file.name} <span className="file-size">· {file.text.length.toLocaleString()} characters</span></span><button className="text-button" type="button" disabled={disabled} aria-label={`Remove ${file.name}`} onClick={() => onChange({ ...value, attachments: value.attachments.filter((_, index) => index !== i) })}>Remove</button></li>)}</ul>}
    <details className="format-help"><summary>Supported formats & limits</summary><p id="problem-help" className="small-note">UTF-8 text, logs, Markdown, JSON, YAML, XML, CSV and source code. Up to 3 files, 20,000 characters each, 60 KB total with your description. For PDFs, Word, audio or video, paste the text/transcript or add a screenshot. Inputs are reporter evidence, not independently verified facts.</p></details>
  </section>;
}
