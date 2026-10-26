import { readFile } from "node:fs/promises";
import { fixtureImagePath } from "@/lib/gemma/fixture-provider";
import { fixtureCases, type FixtureId } from "@/lib/fixtures/data";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id") ?? "clipping";
  if (!Object.hasOwn(fixtureCases, id)) return new Response("Unknown sample", { status: 404 });
  return new Response(await readFile(fixtureImagePath(id as FixtureId)), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff" } });
}
