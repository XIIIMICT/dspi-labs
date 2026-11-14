/**
 * Shared variants.json validation for all labs: parseable JSON, non-empty
 * dictionaries, positive integer variant numbers with no overlaps within a
 * lab, and a non-empty language string. Lab-specific fields are validated by
 * each lab's own test (see tests/labs/).
 */

import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

interface LabVariantJson {
  variants: unknown;
  язык: unknown;
  [key: string]: unknown;
}

const labsDir = fileURLToPath(new URL("../src/lib/labs", import.meta.url));
const labDirs = readdirSync(labsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name.startsWith("lab-"))
  .map((entry) => entry.name);

assert.ok(labDirs.length > 0, "at least one lab must exist in src/lib/labs");

for (const lab of labDirs) {
  let entries: LabVariantJson[];
  try {
    entries = JSON.parse(
      readFileSync(join(labsDir, lab, "variants.json"), "utf8"),
    ) as LabVariantJson[];
  } catch (error) {
    assert.fail(`${lab}: variants.json is not valid JSON: ${String(error)}`);
  }

  assert.ok(Array.isArray(entries), `${lab}: root must be an array of dictionaries`);
  assert.ok(entries.length > 0, `${lab}: dictionaries array must not be empty`);

  const seen = new Set<number>();
  for (const [i, entry] of entries.entries()) {
    const prefix = `${lab}[${i}]`;
    assert.ok(
      entry !== null && typeof entry === "object" && !Array.isArray(entry),
      `${prefix}: must be an object`,
    );
    assert.ok(Array.isArray(entry.variants), `${prefix}: variants must be an array of numbers`);
    assert.ok(entry.variants.length > 0, `${prefix}: variants must not be empty`);
    for (const n of entry.variants) {
      assert.ok(
        typeof n === "number" && Number.isInteger(n) && n > 0,
        `${prefix}: variant ${String(n)} must be a positive integer`,
      );
      assert.ok(
        !seen.has(n),
        `${prefix}: variant ${n} is duplicated — variant sets must not overlap within a lab`,
      );
      seen.add(n);
    }
    assert.ok(
      typeof entry.язык === "string" && entry.язык.trim() !== "",
      `${prefix}: language must be a non-empty string`,
    );
  }

  console.log(
    `${lab}: ${entries.length} dictionaries, variants ${[...seen].sort((a, b) => a - b).join(", ")}`,
  );
}

console.log("shared variants.json validation passed ✓");
