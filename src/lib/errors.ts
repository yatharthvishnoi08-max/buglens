export const errorCodes = ["INVALID_IMAGE", "IMAGE_TOO_LARGE", "REPORTER_CONTEXT_REQUIRED", "INSUFFICIENT_VISUAL_EVIDENCE", "MODEL_UNAVAILABLE", "MODEL_OUTPUT_INVALID", "REPOSITORY_UNAVAILABLE", "UNVERIFIED_FILE_REFERENCE", "HYPOTHESIS_LEAK", "COMPILATION_FAILED"] as const;
export type ErrorCode = typeof errorCodes[number];
export class BugLensError extends Error {
  constructor(public readonly code: ErrorCode, message: string) { super(message); this.name = "BugLensError"; }
}
export function publicError(error: unknown) {
  return error instanceof BugLensError ? { code: error.code, message: error.message } : { code: "COMPILATION_FAILED" as const, message: "The draft could not be completed. No issue was published." };
}
