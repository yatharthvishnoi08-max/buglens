"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useReport } from "@/components/ReportSession";
import { EvidenceBoard } from "@/components/EvidenceBoard";
import { RepositoryMatches } from "@/components/RepositoryMatches";
import { IssuePreview } from "@/components/IssuePreview";
import { ValidationStatus } from "@/components/ValidationStatus";
import { RepositoryReview } from "@/components/RepositoryReview";
export default function ResultPage() {
  const { result, review, preview } = useReport();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (result) { window.scrollTo({ top: 0, left: 0, behavior: "instant" }); heading.current?.focus({ preventScroll: true }); } }, [result]);
  if (review) return <RepositoryReview result={review} preview={preview}/>;
  if (!result) return <main id="main" className="workspace empty-state"><p className="eyebrow">NO DRAFT IN THIS TAB</p><h1>Start with your repository.</h1><p>Reports are held in memory only. Refreshing clears your draft.</p><Link href="/demo" className="button primary">Review a repository →</Link></main>;
  return <main id="main" className="result-workspace"><div className="result-heading"><div><p className="eyebrow">YOUR ISSUE DRAFT</p><h1 ref={heading} tabIndex={-1}>Ready for a human review.</h1><p>Every observation has a source. Every unknown stays visible.</p></div><div><span className={`badge ${result.metadata.provider === "fixture" ? "amber" : "green"}`}>{result.metadata.provider === "fixture" ? "Synthetic fixture mode" : "Live Gemma 4"}</span><Link href="/demo?sample=clipping" className="text-button">New report ↗</Link></div></div><ValidationStatus/><div className="result-grid"><div className="issue-column"><IssuePreview markdown={result.issueMarkdown}/><details className="limitations panel"><summary>Limitations & inference boundaries</summary><ul>{[...result.limitations, ...result.visualAnalysis.forbiddenInferences].map((text, i) => <li key={i}>{text}</li>)}</ul></details></div><aside className="evidence-column" aria-label="Supporting evidence"><section className="panel source-preview"><div className="panel-heading"><h2>Source screenshot</h2><span className="badge neutral">Input</span></div><img src={preview} alt="Screenshot used to produce this issue draft"/></section><EvidenceBoard result={result}/><RepositoryMatches matches={result.repositoryMatches}/></aside></div></main>;
}
