import { z } from "zod";
import { BugLensError } from "../errors";
export const TEXT_FILE_ACCEPT = ".txt,.md,.log,.json,.yaml,.yml,.xml,.csv,.tsv,.js,.jsx,.ts,.tsx,.mjs,.cjs,.py,.go,.rs,.java,.rb,.php,.css,.scss,.html,.sql,.sh";
export const ProblemInputSchema = z.object({
  text: z.string().max(20000).default(""),
  attachments: z.array(z.object({ name: z.string().min(1).max(120), text: z.string().max(20000) }).strict()).max(3).default([]),
}).strict();
export type ProblemInput = z.infer<typeof ProblemInputSchema>;
export function problemInput(value: unknown): ProblemInput {
  const parsed = ProblemInputSchema.safeParse(value ?? {});
  if (!parsed.success) throw new BugLensError("REPORTER_CONTEXT_REQUIRED", "Use a description and up to three supported text files, each at most 20,000 characters.");
  const input = parsed.data;
  const combined = [input.text, ...input.attachments.map(f => f.text)].join("\n");
  if (new TextEncoder().encode(combined).length > 60000) throw new BugLensError("REPORTER_CONTEXT_REQUIRED", "Keep the combined problem description and text files below 60 KB.");
  if (/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(combined)) throw new BugLensError("REPORTER_CONTEXT_REQUIRED", "Only readable UTF-8 text is supported. Binary documents, archives, audio and video must be converted to text or a screenshot first.");
  for (const file of input.attachments) {
    if (/[\/\\\x00-\x1f]/.test(file.name) || !TEXT_FILE_ACCEPT.split(",").some(ext => file.name.toLowerCase().endsWith(ext))) throw new BugLensError("REPORTER_CONTEXT_REQUIRED", "Unsupported attachment. Use a text, log, Markdown, structured-data or source-code file.");
  }
  return input;
}
export function problemText(input: ProblemInput) { return [input.text, ...input.attachments.map(f => `Attachment: ${f.name}\n${f.text}`)].filter(Boolean).join("\n\n"); }
