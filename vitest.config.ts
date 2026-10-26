import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({ resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } }, test: { include: ["tests/unit/**/*.test.ts", "tests/contract/**/*.test.ts", "tests/gemma-client.test.ts"], testTimeout: 15000 } });
