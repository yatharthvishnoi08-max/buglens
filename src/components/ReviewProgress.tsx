import { Icon } from "./Icon";

export function ReviewProgress({ stages, running, error }: { stages: string[]; running: boolean; error: boolean }) {
  if (!stages.length) return null;
  return <section className="review-progress" aria-label="Repository review progress" aria-live="polite" aria-atomic="true">
    <div className="progress-title"><span className={running ? "spinner" : "progress-stop"} aria-hidden="true">{!running && <Icon name={error ? "alert" : "check"} size={18}/>}</span><h2>{running ? "Review in progress" : error ? "Review paused by an error" : "Review complete"}</h2></div>
    <p>{stages[stages.length - 1]}</p>
    {running && <p className="small-note">Keep this tab open. Results appear when the review finishes.</p>}
    <details><summary>View completed stages</summary><ol>{stages.map((stage, i) => <li key={i}>{stage}</li>)}</ol></details>
  </section>;
}
