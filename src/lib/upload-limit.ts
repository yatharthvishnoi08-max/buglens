export function maxUploadBytes() {
  // Leave room for multipart metadata below Vercel's 4.5 MB request limit.
  const cap = process.env.VERCEL === "1" ? 4 : 8;
  const requested = Number(process.env.MAX_UPLOAD_MB ?? cap);
  return (Number.isFinite(requested) && requested > 0 ? Math.min(requested, cap) : cap) * 1024 * 1024;
}
