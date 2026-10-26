"use client";
import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react";
import type { BugLensResult } from "@/lib/schema/result";
type Session = { result: BugLensResult | null; preview: string; setReport: (result: BugLensResult, preview: string) => void; clear: () => void };
const Context = createContext<Session | null>(null);
export function ReportSession({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ result: BugLensResult | null; preview: string }>({ result: null, preview: "" });
  const lastPreview = useRef("");
  function replace(result: BugLensResult | null, preview: string) { if (lastPreview.current.startsWith("blob:") && lastPreview.current !== preview) URL.revokeObjectURL(lastPreview.current); lastPreview.current = preview; setState({ result, preview }); }
  useEffect(() => () => { if (lastPreview.current.startsWith("blob:")) URL.revokeObjectURL(lastPreview.current); }, []);
  return <Context.Provider value={{ ...state, setReport: replace, clear: () => replace(null, "") }}>{children}</Context.Provider>;
}
export function useReport() { const value = useContext(Context); if (!value) throw new Error("Missing report context"); return value; }
