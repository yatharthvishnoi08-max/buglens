import type { Metadata } from "next";
import Link from "next/link";
import { ReportSession } from "@/components/ReportSession";
import { Icon } from "@/components/Icon";
import "./globals.css";
export const metadata: Metadata = { title: "BugLens — Turn visual symptoms into repository-ready issues", description: "A reusable Gemma 4 agent skill. Screenshot evidence, verified source files, and a Markdown issue you can inspect." };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><a className="skip-link" href="#main">Skip to content</a><ReportSession><header className="site-header"><Link href="/" className="brand" aria-label="BugLens home"><span className="brand-icon"><Icon /></span>BugLens<span className="brand-period">.</span></Link><nav aria-label="Main navigation"><Link href="/how-it-works">How it works</Link><Link className="nav-source" href="/how-it-works#install">Install skill</Link><Link className="button small dark" href="/demo">Try BugLens <Icon name="arrow" size={16}/></Link></nav></header>{children}<footer className="site-footer"><span><strong>BugLens.</strong> Evidence before explanation.</span><span>Open source · Apache 2.0 · Powered by Gemma 4</span></footer></ReportSession></body></html>;
}
