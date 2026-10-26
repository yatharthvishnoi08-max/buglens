import { Icon } from "./Icon";
const labels = ["Inspecting screenshot", "Validating evidence", "Searching repository", "Verifying file references", "Compiling issue"];
export function ProcessingSteps({ stage, failed }: { stage: number; failed: boolean }) {
  return <section className="processing panel" aria-label="Analysis progress"><p className="eyebrow">THE EVIDENCE PIPELINE</p><ol>{labels.map((label, i) => <li key={label} className={i < stage ? "done" : i === stage ? "active" : ""}><span className="step-dot">{i < stage ? <Icon name="check" size={14}/> : i + 1}</span><span>{label}</span><small>{i < stage ? "Complete" : i === stage ? failed ? "Stopped" : "In progress" : "Waiting"}</small></li>)}</ol><p className="sr-only" role="status" aria-live="polite">{failed ? "Analysis stopped. Review the error." : labels[stage] ?? "Analysis complete."}</p></section>;
}
