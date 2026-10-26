import type { Metadata } from "next";
import Link from "next/link";
import { ReportSession } from "@/components/ReportSession";
import { SiteNavigation } from "@/components/SiteNavigation";
import { BrandLogo } from "@/components/BrandLogo";
import "./globals.css";
import "./brand.css";
export const metadata: Metadata = { title: "BugLens — Review your code. Plan the fix.", description: "Repository-first code review with Gemma 4: source checks, security advisories, optional screenshots, full reports and fix prompts." };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><a className="skip-link" href="#main">Skip to content</a><ReportSession><SiteNavigation/>{children}<footer className="site-footer"><span className="footer-identity"><BrandLogo compact/><span>Evidence before explanation.</span></span><nav aria-label="Footer navigation"><Link href="/how-it-works#privacy">Privacy & limits</Link><a href="https://github.com/yatharthvishnoi08-max/buglens">Source on GitHub</a><span>Apache 2.0</span></nav></footer></ReportSession></body></html>;
}
