/**
 * Lab-specific variant field validation. Each lab may define its own set of
 * fields; this map is keyed by the lab title from registry.json. Shared
 * invariants (variant numbers, language) live in tests/registry.test.mts.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

type FieldCheck = (value: unknown, prefix: string) => void;

const nonEmptyString: FieldCheck = (value, prefix) =>
  assert.ok(
    typeof value === "string" && value.trim() !== "",
    `${prefix}: must be a non-empty string`,
  );
const positiveInt: FieldCheck = (value, prefix) =>
  assert.ok(
    typeof value === "number" && Number.isInteger(value) && value > 0,
    `${prefix}: must be a positive integer`,
  );

/** Looks up a field case-insensitively so key capitalization stays a data concern. */
function fieldValue(entry: Record<string, unknown>, field: string): unknown {
  const key = Object.keys(entry).find((k) => k.toLowerCase() === field.toLowerCase());
  return key === undefined ? undefined : entry[key];
}

const schemas: Record<string, Record<string, FieldCheck>> = {
  "Инвертированный индекс и словарь": { Вид: nonEmptyString },
  "Стемминг и лемматизация": { Алгоритм: nonEmptyString, Вид: nonEmptyString },
  "Сравнение текстов с помощью алгоритма шинглов": {
    "Алгоритм хэширования": nonEmptyString,
    "Слов в шинглах": positiveInt,
  },
  "Оценка качества поиска": {
    "Алгоритм хэширования": nonEmptyString,
    "Слов в шинглах": positiveInt,
  },
};

const file = fileURLToPath(new URL("../../src/lib/labs/registry.json", import.meta.url));
const registry = JSON.parse(readFileSync(file, "utf8")) as {
  title: string;
  variants: Record<string, unknown>[];
}[];

for (const lab of registry) {
  const schema = schemas[lab.title];
  assert.ok(schema, `no lab-specific schema defined for "${lab.title}"`);
  for (const [i, entry] of lab.variants.entries()) {
    for (const [field, check] of Object.entries(schema)) {
      check(fieldValue(entry, field), `${lab.title}.variants[${i}].${field}`);
    }
  }
  console.log(`${lab.title}: lab-specific fields validated ✓`);
}
