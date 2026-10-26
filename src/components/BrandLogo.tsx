/** Decorative mark; the surrounding wordmark or link provides its accessible name. */
export function BrandMark({ size = 38 }: { size?: number }) {
  return <img className="brand-mark" src="/brand/buglens-mark.svg" alt="" aria-hidden="true" width={size} height={size}/>;
}

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return <span className={`brand-lockup${compact ? " brand-lockup--compact" : ""}`}><BrandMark size={compact ? 26 : 38}/><span className="brand-wordmark">Bug<span className="brand-wordmark-accent">Lens</span></span></span>;
}
