import sharp from "sharp";
import { BugLensError } from "./errors";
export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export type ImageType = typeof IMAGE_TYPES[number];
export function maxUploadBytes() {
  const mb = Number(process.env.MAX_UPLOAD_MB ?? "8");
  return (Number.isFinite(mb) && mb > 0 ? Math.min(mb, 8) : 8) * 1024 * 1024;
}
export async function validateImage(bytes: Uint8Array, mimeType: string): Promise<{ bytes: Buffer; mimeType: ImageType }> {
  if (bytes.byteLength > maxUploadBytes()) throw new BugLensError("IMAGE_TOO_LARGE", `Use an image smaller than ${maxUploadBytes() / 1024 / 1024} MB.`);
  if (!bytes.byteLength || !IMAGE_TYPES.includes(mimeType as ImageType)) throw new BugLensError("INVALID_IMAGE", "Use a valid PNG, JPEG, or WebP screenshot.");
  try {
    const image = sharp(bytes, { limitInputPixels: 16_000_000, animated: false });
    const meta = await image.metadata();
    const formats: Record<string, string> = { png: "image/png", jpeg: "image/jpeg", webp: "image/webp" };
    const detected = formats[meta.format ?? ""];
    if (detected !== mimeType || !meta.width || !meta.height || (meta.pages ?? 1) > 1) throw new Error("invalid format");
    // Fully decode and strip metadata in memory. No image or provider file upload is persisted.
    const normalized = await image.rotate().png().toBuffer();
    if (normalized.length > maxUploadBytes()) throw new BugLensError("IMAGE_TOO_LARGE", "The decoded screenshot exceeds the image limit. Reduce its dimensions and retry.");
    return { bytes: normalized, mimeType: "image/png" };
  } catch (error) { if (error instanceof BugLensError) throw error; throw new BugLensError("INVALID_IMAGE", "The image could not be decoded safely. Try a static PNG, JPEG, or WebP."); }
}
