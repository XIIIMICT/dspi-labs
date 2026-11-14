/**
 * Shingles-lab variant schema: { variants, алгоритм хэширования,
 * слов в шинглах, язык }. Applied to every lab dir that declares this schema
 * (currently lab-3 and lab-4); shared invariants live in
 * tests/variants-json.test.mts.
 */

import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

interface ShingleVariant {
  "алгоритм хэширования": unknown;
  "слов в шинглах": unknown;
}

const labsDir = fileURLToPath(new URL("../../src/lib/labs", import.meta.url));
const labs = readdirSync(labsDir, { withFileTypes: true })
  .map((entry) => entry.name)
  .filter((name) => /^lab-\d+$/.test(name));

for (const lab of labs) {
  const file = join(labsDir, lab, "variants.json");
  const entries = JSON.parse(readFileSync(file, "utf8")) as ShingleVariant[];
  // Only validate labs whose dictionaries declare the shingles fields.
  if (!entries.some((entry) => "алгоритм хэширования" in entry)) continue;

  for (const [i, entry] of entries.entries()) {
    assert.ok(
      typeof entry["алгоритм хэширования"] === "string" &&
        entry["алгоритм хэширования"].trim() !== "",
      `${lab}[${i}]: алгоритм хэширования must be a non-empty string`,
    );
    assert.ok(
      typeof entry["слов в шинглах"] === "number" &&
        Number.isInteger(entry["слов в шинглах"]) &&
        entry["слов в шинглах"] > 0,
      `${lab}[${i}]: слов в шинглах must be a positive integer`,
    );
  }
  console.log(`${lab}: shingles schema validated ✓`);
}
