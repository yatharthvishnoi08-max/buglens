import { Icon } from "./Icon";
export function ValidationStatus() { return <div className="validation-status" role="status" aria-live="polite"><Icon name="check"/><div><strong>Issue draft validated</strong><span>Schema, provenance and file references checked. Review before sharing.</span></div></div>; }
