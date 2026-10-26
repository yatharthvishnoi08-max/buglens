"use client";
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
  return <section className="panel problem-input"><div className="panel-heading"><h2>Describe the problem or review goals</h2><span className="badge blue">Your evidence</span></div><div className="repo-fields"><label htmlFor="problem-text">Paste a description, error, stack trace, logs or code</label><textarea id="problem-text" rows={6} maxLength={20000} value={value.text} disabled={disabled} onChange={e => onChange({ ...value, text: e.target.value })} placeholder="What is failing? What should happen? Paste the error, steps to reproduce, relevant logs, or improvements you want reviewed."/><p className="small-note">Your text is reporter-supplied evidence, not a verified fact. You can also attach UTF-8 text, Markdown, logs, JSON, YAML, XML, CSV or source-code files. Up to 3 files, 20,000 characters each, 60 KB total including pasted text.</p><label className="button secondary text-upload">Attach text or code files<input type="file" multiple accept={TEXT_FILE_ACCEPT} disabled={disabled} aria-label="Attach supporting text files" onChange={e => { void filesSelected(e.target.files); e.target.value = ""; }}/></label>{value.attachments.length > 0 && <ul className="attachment-list">{value.attachments.map((file, i) => <li key={`${file.name}-${i}`}><span>{file.name} · {file.text.length.toLocaleString()} characters</span><button className="text-button" type="button" disabled={disabled} onClick={() => onChange({ ...value, attachments: value.attachments.filter((_, index) => index !== i) })}>Remove {file.name}</button></li>)}</ul>}<p className="small-note">For PDFs, Word documents, audio or video, paste the relevant text/transcript or attach a screenshot. These binary formats are not parsed.</p></div></section>;
}
