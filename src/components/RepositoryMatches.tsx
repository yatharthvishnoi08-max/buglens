import type { RepositoryMatch } from "@/lib/schema/evidence";
import { Icon } from "./Icon";
export function RepositoryMatches({ matches }: { matches: RepositoryMatch[] }) {
  return <section className="panel repository-matches"><div className="panel-heading"><h2>Repository references</h2><span className="badge green">✓ {matches.length} verified</span></div><p className="small-note">File existence and source are verified. Relevance to the symptom remains a hypothesis.</p>{matches.map((m) => <details key={m.path}><summary><Icon name="file" size={16}/><code>{m.path}</code></summary><p>{m.matchReason}</p>{m.symbol && <p>Declaration: <code>{m.symbol}</code> at line {m.line}</p>}<pre tabIndex={0} aria-label={`Source excerpt from ${m.path}`}>{m.excerpt}</pre><p className="small-note">SHA-256: <code>{m.sha256}</code></p></details>)}</section>;
}
