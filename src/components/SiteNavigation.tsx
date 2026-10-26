"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "./BrandLogo";

export function SiteNavigation() {
  const path = usePathname();
  return <header className="site-header"><div className="header-inner">
    <Link href="/" className="brand" aria-label="BugLens home"><BrandLogo/></Link>
    <nav aria-label="Main navigation">
      <Link href="/demo" aria-current={path === "/demo" || path === "/result" ? "page" : undefined}>Web app</Link>
      <Link href="/how-it-works" aria-current={path === "/how-it-works" ? "page" : undefined}>Guide</Link>
    </nav>
    <span className="header-note"><span className="status-dot"/>Evidence before explanation</span>
  </div></header>;
}
