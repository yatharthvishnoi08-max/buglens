import type { ReactNode } from "react";
import { Icon } from "./Icon";

export function FeedbackBanner({ title, children, tone = "info", id }: { title: string; children: ReactNode; tone?: "info" | "success" | "warning" | "error"; id?: string }) {
  return <div id={id} className={`feedback feedback-${tone}`} role={tone === "error" ? "alert" : tone === "success" ? "status" : undefined}>
    <Icon name={tone === "success" ? "check" : tone === "error" || tone === "warning" ? "alert" : "lens"} size={19}/>
    <div><strong>{title}</strong><div className="feedback-description">{children}</div></div>
  </div>;
}
