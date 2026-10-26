import Link from "next/link";
import { Icon } from "@/components/Icon";
export default function NotFound() { return <main id="main" className="workspace empty-state"><span className="empty-icon"><Icon name="lens" size={30}/></span><p className="eyebrow">404 / NOTHING HERE</p><h1>This page is out of view.</h1><p>The link may have changed. Your next review can start in the workspace.</p><Link href="/demo" className="button primary">Open the workspace <Icon name="arrow" size={18}/></Link></main>; }
