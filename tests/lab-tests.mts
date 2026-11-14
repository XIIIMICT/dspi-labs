/**
 * Discovers and runs per-lab variant tests under tests/labs/. A new lab's test
 * is picked up automatically — no package.json edit needed.
 */

import { readdirSync } from "node:fs";

const testsDir = new URL("./labs/", import.meta.url);
const files = readdirSync(testsDir)
  .filter((name) => name.endsWith(".test.mts"))
  .sort((a, b) => a.localeCompare(b));

for (const file of files) {
  await import(new URL(file, testsDir).href);
}
