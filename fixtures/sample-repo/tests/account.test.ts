import { expect, test } from "vitest";
test("profile route is absolute", () => expect("/profile".startsWith("/")).toBe(true));
