/**
 * Lab 2 variant schema: { variants, алгоритм, вид, язык }.
 * Shared invariants live in tests/variants-json.test.mts.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

interface Lab2Variant {
  алгоритм: unknown;
  вид: unknown;
}

const file = fileURLToPath(new URL("../../src/lib/labs/lab-2/variants.json", import.meta.url));
const entries = JSON.parse(readFileSync(file, "utf8")) as Lab2Variant[];

for (const [i, entry] of entries.entries()) {
  assert.ok(
    typeof entry.алгоритм === "string" && entry.алгоритм.trim() !== "",
    `lab-2[${i}]: алгоритм must be a non-empty string`,
  );
  assert.ok(
    typeof entry.вид === "string" && entry.вид.trim() !== "",
    `lab-2[${i}]: вид must be a non-empty string`,
  );
}

console.log("lab-2: алгоритм, вид validated ✓");
