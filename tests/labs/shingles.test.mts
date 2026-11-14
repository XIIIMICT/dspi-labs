/**
 * Lab 3 (shingles) tests: canonicalization, 8-word overlapping shingles,
 * SHA-1 vectors, the 84 control-sum construction, and pairwise similarity
 * for identical / disjoint / partially overlapping texts.
 */

import assert from "node:assert/strict";
import {
  HASH_FUNCTION_COUNT,
  buildShingles,
  buildSketch,
  canonicalize,
  compareAllPairs,
  compareSketches,
  countEnglishWords,
  hashShingle,
  shingleText,
  sha1Hex,
} from "../../src/lib/labs/shingles/shingles.ts";

// --- Canonicalization: lowercase, punctuation stripped, stop words removed ---
assert.deepEqual(canonicalize("The quick, brown Fox!"), ["quick", "brown", "fox"]);
assert.deepEqual(canonicalize("of the and"), []);
assert.deepEqual(canonicalize("It IS what it is"), ["what"]);
// Digits and punctuation are separators (English letters only).
assert.deepEqual(canonicalize("abc123def"), ["abc", "def"]);

// --- Word counting (≥1000-word contract) ---
assert.equal(countEnglishWords("one two three"), 3);
assert.equal(countEnglishWords("ровно три английских words here"), 2);
assert.equal(countEnglishWords(""), 0);

// --- Shingle construction: count = tokens − width + 1, overlapping ---
const tokens = ["a", "b", "c", "d", "e", "f", "g", "h", "i"];
assert.equal(buildShingles(tokens.slice(0, 7), 8).length, 0); // fewer than 8
const exactly8 = buildShingles(tokens.slice(0, 8), 8);
assert.equal(exactly8.length, 1);
assert.equal(shingleText(exactly8[0]), "a b c d e f g h");
const nine = buildShingles(tokens.slice(0, 9), 8);
assert.equal(nine.length, 2); // 9 − 8 + 1
assert.equal(shingleText(nine[1]), "b c d e f g h i"); // overlap of 7 words

// --- SHA-1 vectors (FIPS 180-4 known answers) ---
assert.equal(sha1Hex(""), "da39a3ee5e6b4b0d3255bfef95601890afd80709");
assert.equal(sha1Hex("abc"), "a9993e364706816aba3e25717850c26c9cd0d89d");
assert.equal(
  sha1Hex("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq"),
  "84983e441c3bd26ebaae4aa1f95129e5e54670f1",
);
// Determinism.
assert.equal(sha1Hex("Разум дан человеку"), sha1Hex("Разум дан человеку"));

// --- 84 hash functions: distinct distributions, stable output ---
assert.equal(HASH_FUNCTION_COUNT, 84);
const values = new Set<number>();
for (let fn = 0; fn < HASH_FUNCTION_COUNT; fn++) {
  values.add(hashShingle(fn, "a b c d e f g h"));
}
assert.ok(values.size > 80, "different salts must mostly produce different sums");
assert.equal(hashShingle(0, "a b c d e f g h"), hashShingle(0, "a b c d e f g h"));

// --- Sketch: control sums are per-row minima over shingles ---
// w1..w8 avoid the stop-word list; bare "a"/"h" would be canonicalized away.
const sketchA = buildSketch("w1 w2 w3 w4 w5 w6 w7 w8 w1 w2 w3 w4 w5 w6 w7 w8", { width: 8 });
assert.equal(sketchA.tokens.length, 16);
assert.equal(sketchA.shingles.length, 9); // 16 − 8 + 1
assert.equal(sketchA.controlSums.length, HASH_FUNCTION_COUNT);
assert.equal(sketchA.controlSumSources.length, HASH_FUNCTION_COUNT);
// Repeated shingle text: minima come from the earliest occurrence.
assert.equal(
  sketchA.controlSums.every((sum) => sum > 0),
  true,
);

// --- Identical texts: similarity 100% ---
const text = Array.from({ length: 40 }, (_, i) => `word${i}`).join(" ");
const s1 = buildSketch(text, { width: 8 });
const s2 = buildSketch(text, { width: 8 });
const identical = compareSketches(s1, s2);
assert.equal(identical.matches, HASH_FUNCTION_COUNT);
assert.equal(identical.similarityPercent, 100);

// --- Disjoint texts: similarity 0% ---
const other = Array.from({ length: 40 }, (_, i) => `other${i}`).join(" ");
const s3 = buildSketch(other, { width: 8 });
const disjoint = compareSketches(s1, s3);
assert.equal(disjoint.matches, 0);
assert.equal(disjoint.similarityPercent, 0);

// --- Partial overlap: between 0 and 100 ---
const half = `${Array.from({ length: 20 }, (_, i) => `word${i}`).join(" ")} ${Array.from({ length: 20 }, (_, i) => `extra${i}`).join(" ")}`;
const s4 = buildSketch(half, { width: 8 });
const partial = compareSketches(s1, s4);
assert.ok(
  partial.matches > 0 && partial.matches < HASH_FUNCTION_COUNT,
  `partial overlap expected, got ${partial.matches}`,
);
assert.ok(partial.similarityPercent > 0 && partial.similarityPercent < 100);

// --- Repeated phrases & punctuation (the assignment's similarity source) ---
const base = "the quick brown fox jumps over the lazy dog".repeat(20);
const withPunct = (base.match(/.{1,9}(\s|$)/g) ?? []).join(". ") + "!";
const sketchPunct = buildSketch(withPunct, { width: 8 });
const sketchPlain = buildSketch(base, { width: 8 });
const punctComparison = compareSketches(sketchPunct, sketchPlain);
assert.ok(
  punctComparison.similarityPercent > 90,
  "punctuation must not affect canonical comparison",
);

// --- Exactly four texts: six unordered pairs, in order ---
const four = [text, other, half, base].map((t) => ({
  name: "t",
  text: t,
  sketch: buildSketch(t, { width: 8 }),
}));
const pairs = compareAllPairs(four);
assert.equal(pairs.length, 6);
assert.deepEqual(
  pairs.map((p) => [p.a, p.b]),
  [
    [0, 1],
    [0, 2],
    [0, 3],
    [1, 2],
    [1, 3],
    [2, 3],
  ],
);

// --- 1000-word boundary ---
const words1000 = Array.from({ length: 1000 }, (_, i) => `w${i}`).join(" ");
assert.equal(countEnglishWords(words1000), 1000);
assert.equal(countEnglishWords(words1000 + " extra"), 1001);
assert.equal(countEnglishWords(words1000.split(" ").slice(0, 999).join(" ")), 999);

console.log("lab 3 shingles tests passed ✓");
