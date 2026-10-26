import type { ReporterContext } from "@/lib/schema/evidence";
export function ReporterContextForm({ value, onChange, disabled }: { value: ReporterContext; onChange: (value: ReporterContext) => void; disabled: boolean }) {
  return <section className="panel context-form"><div className="panel-heading"><h2>What happened?</h2></div><div className="context-fields">
    <label htmlFor="expected">Expected behavior <span>Required</span></label><textarea id="expected" required minLength={5} maxLength={2000} disabled={disabled} value={value.expectedBehavior} onChange={e => onChange({ ...value, expectedBehavior: e.target.value })} placeholder="What should happen?" rows={3} aria-describedby="context-help"/>
    <label htmlFor="actual">Actual behavior <span>Required</span></label><textarea id="actual" required minLength={5} maxLength={2000} disabled={disabled} value={value.actualBehavior} onChange={e => onChange({ ...value, actualBehavior: e.target.value })} placeholder="What happened instead?" rows={3} aria-describedby="context-help"/>
    <label htmlFor="environment">Environment <span>Optional</span></label><textarea id="environment" maxLength={1000} disabled={disabled} value={value.environment} onChange={e => onChange({ ...value, environment: e.target.value })} placeholder="Viewport, browser, OS—only what you know." rows={2}/>
    <p id="context-help" className="small-note">Your statements stay separate from what the image proves.</p>
  </div></section>;
}
