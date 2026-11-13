/**
 * Тест валидности variants.json всех лабораторных: структура словарей,
 * корректность полей и непересечение номеров вариантов в рамках одной лабы.
 */

import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

interface LabVariantJson {
  variants: unknown;
  вид: unknown;
  язык: unknown;
}

const labsDir = fileURLToPath(new URL("../src/lib/labs", import.meta.url));
const labDirs = readdirSync(labsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name.startsWith("lab-"))
  .map((entry) => entry.name);

assert.ok(labDirs.length > 0, "в src/lib/labs должна быть хотя бы одна лабораторная");

for (const lab of labDirs) {
  const entries = JSON.parse(
    readFileSync(join(labsDir, lab, "variants.json"), "utf8"),
  ) as LabVariantJson[];

  assert.ok(Array.isArray(entries), `${lab}: корень файла — массив словарей`);
  assert.ok(entries.length > 0, `${lab}: массив словарей не пуст`);

  const seen = new Set<number>();
  for (const [i, entry] of entries.entries()) {
    const prefix = `${lab}[${i}]`;
    assert.ok(Array.isArray(entry.variants), `${prefix}: поле variants — массив номеров`);
    assert.ok(entry.variants.length > 0, `${prefix}: variants не пуст`);
    for (const n of entry.variants) {
      assert.ok(
        typeof n === "number" && Number.isInteger(n) && n > 0,
        `${prefix}: номер варианта ${String(n)} — целое число > 0`,
      );
      assert.ok(
        !seen.has(n),
        `${prefix}: вариант ${n} указан повторно — variants словарей одной лабы не должны пересекаться`,
      );
      seen.add(n);
    }
    assert.ok(
      typeof entry.вид === "string" && entry.вид.trim() !== "",
      `${prefix}: вид — непустая строка`,
    );
    assert.ok(
      typeof entry.язык === "string" && entry.язык.trim() !== "",
      `${prefix}: язык — непустая строка`,
    );
  }

  console.log(
    `${lab}: ${entries.length} словарей, варианты ${[...seen].sort((a, b) => a - b).join(", ")}`,
  );
}

console.log("variants.json всех лабораторных валиден ✓");
