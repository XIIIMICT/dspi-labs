/**
 * Shared registry.json validation: parseable JSON, non-empty lab list, valid
 * titles/folders/tasks, positive integer variant numbers with no overlaps
 * within a lab, and a non-empty language string. Lab-specific variant fields
 * are validated by the tests in tests/labs/.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

interface LabVariantJson {
  variants: unknown;
  [key: string]: unknown;
}

interface LabJson {
  title: unknown;
  folder: unknown;
  task: unknown;
  variants: LabVariantJson[];
}

const file = fileURLToPath(new URL("../src/lib/labs/registry.json", import.meta.url));
let registry: LabJson[];
try {
  registry = JSON.parse(readFileSync(file, "utf8")) as LabJson[];
} catch (error) {
  assert.fail(`registry.json is not valid JSON: ${String(error)}`);
}

assert.ok(Array.isArray(registry), "registry.json root must be an array of labs");
assert.ok(registry.length > 0, "registry.json must contain at least one lab");

for (const [labIndex, lab] of registry.entries()) {
  const prefix = `registry[${labIndex}]`;
  assert.ok(
    typeof lab.title === "string" && lab.title.trim() !== "",
    `${prefix}: title must be a non-empty string`,
  );
  assert.ok(
    typeof lab.folder === "string" && lab.folder.trim() !== "",
    `${prefix}: folder must be a non-empty string`,
  );
  assert.ok(
    typeof lab.task === "string" && lab.task.trim() !== "",
    `${prefix}: task must be a non-empty string`,
  );
  assert.ok(
    Array.isArray(lab.variants) && lab.variants.length > 0,
    `${prefix}: variants must be a non-empty array`,
  );

  const seen = new Set<number>();
  for (const [i, entry] of lab.variants.entries()) {
    const vprefix = `${prefix}.variants[${i}]`;
    assert.ok(Array.isArray(entry.variants), `${vprefix}: variants must be an array of numbers`);
    assert.ok(entry.variants.length > 0, `${vprefix}: variants must not be empty`);
    for (const n of entry.variants) {
      assert.ok(
        typeof n === "number" && Number.isInteger(n) && n > 0,
        `${vprefix}: variant ${String(n)} must be a positive integer`,
      );
      assert.ok(
        !seen.has(n),
        `${vprefix}: variant ${n} is duplicated — variant sets must not overlap within a lab`,
      );
      seen.add(n);
    }
    const languageKey = Object.keys(entry).find((key) => key.toLowerCase() === "язык");
    assert.ok(
      languageKey !== undefined &&
        typeof entry[languageKey] === "string" &&
        (entry[languageKey] as string).trim() !== "",
      `${vprefix}: language must be a non-empty string`,
    );
  }

  console.log(
    `${prefix} (${String(lab.title)}): variants ${[...seen].sort((a, b) => a - b).join(", ")}`,
  );
}

console.log("shared registry.json validation passed ✓");
