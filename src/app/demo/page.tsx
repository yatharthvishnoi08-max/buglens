import { DemoWorkspace } from "@/components/DemoWorkspace";
export const dynamic = "force-dynamic";
export default async function Demo({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const query = await searchParams;
  return <DemoWorkspace initialSample={query.sample !== undefined} defaultMode={process.env.DEMO_MODE === "live" ? "live" : "fixture"}/>;
}
