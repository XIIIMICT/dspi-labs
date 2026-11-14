/**
 * Lab 1 variant schema: { variants, вид, язык }.
 * Shared invariants live in tests/variants-json.test.mts; this file validates
 * only the fields specific to lab 1.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

interface Lab1Variant {
  вид: unknown;
}

const file = fileURLToPath(new URL("../../src/lib/labs/lab-1/variants.json", import.meta.url));
const entries = JSON.parse(readFileSync(file, "utf8")) as Lab1Variant[];

for (const [i, entry] of entries.entries()) {
  assert.ok(
    typeof entry.вид === "string" && entry.вид.trim() !== "",
    `lab-1[${i}]: вид must be a non-empty string`,
  );
}

console.log("lab-1: вид validated ✓");
