/**
 * Lab 2 state-preservation tests: a rejected replacement must keep the last
 * valid source/result intact, while exposing the validation error.
 * Pure module (`source-state.ts`) is imported directly — no Svelte runtime.
 */

import assert from "node:assert/strict";
import {
  MIN_WORDS,
  applySourceState,
  validateLab2Source,
} from "../../src/lib/labs/stemming/source-state.ts";

const validText = Array.from({ length: MIN_WORDS }, (_, i) => `документ${i}`).join(" ");
const validSource = { name: "valid.txt", text: validText };
const invalidSource = { name: "short.txt", text: "слишком короткий текст" };
const emptySource = { name: "empty.txt", text: "   \n  " };

// --- Validation boundary ---
assert.deepEqual(validateLab2Source(validSource), []);
assert.equal(validateLab2Source(invalidSource).length, 1);
assert.ok(validateLab2Source(emptySource)[0].includes("не содержит ни одного слова"));

// --- First valid application ---
const first = applySourceState(validSource, { source: null, result: null });
assert.equal(first.ok, true);
if (!first.ok) throw new Error("unreachable");
assert.equal(first.next.source.name, "valid.txt");
assert.equal(first.next.result.totalWords, MIN_WORDS);
assert.deepEqual(first.next.errors, []);

// --- Valid → invalid replacement: previous state returned unchanged ---
const rejected = applySourceState(invalidSource, {
  source: first.next.source,
  result: first.next.result,
});
assert.equal(rejected.ok, false);
if (rejected.ok) throw new Error("unreachable");
assert.equal(rejected.previous.source?.name, "valid.txt");
assert.equal(rejected.previous.result?.totalWords, MIN_WORDS);
assert.equal(rejected.errors.length, 1);
// The rejected source is NOT installed as active.
assert.notEqual(rejected.previous.source?.name, "short.txt");

// --- A subsequent valid replacement still succeeds ---
const again = applySourceState(
  { name: "next.txt", text: validText },
  { source: first.next.source, result: first.next.result },
);
assert.equal(again.ok, true);
if (!again.ok) throw new Error("unreachable");
assert.equal(again.next.source.name, "next.txt");
assert.equal(again.next.result.totalWords, MIN_WORDS);

// --- Empty replacement is also non-destructive ---
const emptyRejected = applySourceState(emptySource, {
  source: first.next.source,
  result: first.next.result,
});
assert.equal(emptyRejected.ok, false);
assert.equal(emptyRejected.errors[0].includes("не содержит ни одного слова"), true);

console.log("lab 2 source state preservation tests passed ✓");
