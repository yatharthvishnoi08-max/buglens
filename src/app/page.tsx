import Link from "next/link";
import { Icon } from "@/components/Icon";
import { BrandMark } from "@/components/BrandLogo";
export default function Home() {
  return <main id="main" className="landing">
    <section className="hero">
      <div className="hero-copy"><p className="eyebrow">CODE REVIEW, WITH CONTEXT</p><h1>See the bug.<br/><em>Plan the fix.</em></h1><p className="hero-description">Turn your repository, error logs and screenshots into evidence-backed findings and a practical fix plan.</p>
        <div className="hero-actions"><Link href="/demo" className="button primary">Open web app <Icon name="arrow" size={18}/></Link><Link href="/demo?sample=clipping" className="text-button">Try the sample bug</Link></div>
        <div className="hero-facts"><span><Icon name="check" size={16}/>No installation needed</span><span><Icon name="check" size={16}/>Read-only analysis</span><span><Icon name="check" size={16}/>Gemma 4 + source checks</span></div>
      </div>
      <figure className="product-preview" aria-label="Synthetic example showing a clipped checkout and a source candidate">
        <div className="preview-toolbar"><span className="preview-brand"><BrandMark size={20}/>BugLens / review</span><span className="badge neutral">Synthetic example</span></div>
        <div className="preview-body">
          <div className="preview-image"><img src="/api/sample-image?id=clipping" width="390" height="844" alt="Synthetic checkout with the Continue button extending outside the visible page"/><span className="image-caption">01 · Visible symptom</span></div>
          <div className="preview-finding"><span className="badge amber">UI · needs verification</span><h2>A clipped action.<br/>A place to investigate.</h2><div className="preview-source"><span>src/styles/checkout.css</span><pre><span className="code-muted">.checkout-actions button</span>{" {\n  min-width: 240px;\n  flex-shrink: 0;\n}"}</pre></div><p>Source candidate, not a proven cause.</p></div>
        </div>
        <figcaption><span><Icon name="file" size={17}/>Evidence → report → fix prompt</span><Link href="/demo?sample=clipping" aria-label="Explore the synthetic review example"><Icon name="arrow" size={18}/></Link></figcaption>
      </figure>
    </section>
    <section className="how-section" aria-labelledby="how-title"><div className="section-intro"><p className="eyebrow">FROM REPOSITORY TO NEXT STEP</p><h2 id="how-title">Less guesswork.<br/>A clearer handoff.</h2></div><ol className="journey-steps">
      <li><span className="step-label">01 / CONNECT</span><h3>Bring your repository.</h3><p>Start with a public GitHub URL. We inspect a fixed commit without running its code.</p></li>
      <li><span className="step-label">02 / INVESTIGATE</span><h3>Add the missing context.</h3><p>Review broadly, or focus on a problem with text, logs, code or a screenshot.</p></li>
      <li><span className="step-label">03 / ACT</span><h3>Leave with a fix plan.</h3><p>Get source-linked findings, downloadable documentation and prompts for your coding agent.</p></li>
    </ol></section>
    <section className="closing-cta"><div><p className="eyebrow">YOUR CODE. YOUR NEXT MOVE.</p><h2>A useful review starts with a repo.</h2><p>Clear evidence. Visible limits. No unverified “all clear.”</p></div><Link href="/demo" className="button primary">Start a review <Icon name="arrow" size={18}/></Link></section>
  </main>;
}
