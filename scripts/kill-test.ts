import { readFile } from "node:fs/promises";
import { liveProvider } from "../src/lib/gemma/live-provider";
import { fixtureCases, type FixtureId } from "../src/lib/fixtures/data";
import { validateImage } from "../src/lib/image";
import { publicError } from "../src/lib/errors";
const id = (process.argv[2] ?? "clipping") as FixtureId;
if (!(id in fixtureCases)) throw new Error("Unknown fixture case");
try {
  const image = await validateImage(await readFile(`fixtures/screenshots/${fixtureCases[id].image}`), "image/png");
  const result = await liveProvider.analyze({ image, context: fixtureCases[id].context });
  console.log(JSON.stringify({ case: id, liveRequestCompleted: true, ...result }, null, 2));
} catch (error) { console.error(JSON.stringify({ case: id, liveRequestCompleted: false, ...publicError(error) })); process.exitCode = 1; }
