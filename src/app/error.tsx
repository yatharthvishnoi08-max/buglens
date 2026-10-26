"use client";
import Link from "next/link";
import { Icon } from "@/components/Icon";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <main id="main" className="workspace empty-state"><span className="empty-icon"><Icon name="alert" size={30}/></span><p className="eyebrow">SOMETHING INTERRUPTED THE PAGE</p><h1>Let’s try that again.</h1><p>The page couldn’t load. Retry, or return to the workspace.</p><div className="button-row"><button type="button" className="button primary" onClick={reset}>Try again</button><Link href="/demo" className="button secondary">Open workspace</Link></div></main>; }
