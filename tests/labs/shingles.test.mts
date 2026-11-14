/**
 * Lab 3 (shingles) tests: canonicalization (including conservative English
 * singularization), 8-word overlapping shingles, SHA-1 and salted-hash
 * known-answer vectors, the 84 control-sum construction, empty-sketch
 * rejection, and pairwise similarity for identical / disjoint / partially
 * overlapping texts.
 */

import assert from "node:assert/strict";
import {
  HASH_FUNCTION_COUNT,
  EmptySketchError,
  buildShingles,
  buildSketch,
  canonicalize,
  compareAllPairs,
  compareSketches,
  contentKey,
  countEnglishWords,
  hashShingle,
  shingleText,
  sha1Hex,
  singularize,
} from "../../src/lib/labs/shingles/shingles.ts";

// --- Canonicalization: lowercase, punctuation/tags/digits, stop words ---
assert.deepEqual(canonicalize("The quick, brown Fox!"), ["quick", "brown", "fox"]);
assert.deepEqual(canonicalize("of the and"), []);
assert.deepEqual(canonicalize("It IS what it is"), ["what"]);
assert.deepEqual(canonicalize("abc123def"), ["abc", "def"]);
assert.deepEqual(canonicalize("<p>Hello</p> world"), ["hello", "world"]);
// Source text is never mutated by canonicalization.
const source = "The CATS, boxes and children!";
const frozen = source.slice();
canonicalize(source);
assert.equal(source, frozen);

// --- Conservative singularization: known plurals normalize, common
// singular/non-noun words and inherited object properties stay intact ---
assert.equal(singularize("cats"), "cat");
assert.equal(singularize("boxes"), "box");
assert.equal(singularize("classes"), "class");
assert.equal(singularize("companies"), "company");
assert.equal(singularize("heroes"), "hero");
assert.equal(singularize("documents"), "document");
assert.equal(singularize("children"), "child");
assert.equal(singularize("men"), "man");
assert.equal(singularize("indices"), "index");
assert.equal(singularize("mice"), "mouse");
// --- Ambiguous forms are left unchanged (no POS/context analysis) ---
// "bases" can be the plural of "base" OR "basis"; "data" is commonly a
// mass/singular noun in technical English. Neither is mapped to a singular.
for (const word of ["bases", "base", "basis", "data", "datum", "databases"]) {
  assert.equal(singularize(word), word, `${word} is ambiguous and must be preserved`);
}
assert.deepEqual(canonicalize("bases data bases"), ["bases", "data", "bases"]);
assert.deepEqual(canonicalize("the bases of the data"), ["bases", "data"]);
// Unambiguous irregulars still normalize (the exclusions are narrow).
assert.equal(singularize("indices"), "index");
assert.equal(singularize("analyses"), "analysis");
assert.equal(singularize("crises"), "crisis");

// Blanket suffix stripping would corrupt these ordinary words.
for (const word of [
  "news",
  "series",
  "species",
  "physics",
  "always",
  "various",
  "alias",
  "bus",
  "class",
  "analysis",
  "this",
  "constructor",
  "toString",
  "hasOwnProperty",
]) {
  assert.equal(singularize(word), word, `${word} must not be corrupted`);
  assert.equal(typeof singularize(word), "string", `${word} must stay a string`);
}
// Prototype-safe lookup: no function/object can leak into canonical tokens.
assert.deepEqual(canonicalize("constructor"), ["constructor"]);
assert.deepEqual(canonicalize("toString hasOwnProperty"), ["tostring", "hasownproperty"]);
assert.ok(canonicalize("the cats and news").every((t) => typeof t === "string"));
// Plural/singular forms canonicalize to the same token.
assert.deepEqual(canonicalize("cat cats CATS"), ["cat", "cat", "cat"]);
assert.deepEqual(canonicalize("a box boxes"), ["box", "box"]);

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
assert.equal(sha1Hex("Разум дан человеку"), sha1Hex("Разум дан человеку"));

// --- 84 salted hash functions: known answers + distinct domains ---
assert.equal(HASH_FUNCTION_COUNT, 84);
// Known-answer vectors: hashShingle(salt, text) === first 6 bytes of
// SHA-1(`${salt}:${text}`) as a big-endian 48-bit integer.
function expectedFold(salt: number, text: string): number {
  const hex = sha1Hex(`${salt}:${text}`);
  return Number.parseInt(hex.slice(0, 12), 16);
}
assert.equal(hashShingle(0, "a b c d e f g h"), expectedFold(0, "a b c d e f g h"));
assert.equal(hashShingle(7, "alpha beta gamma"), expectedFold(7, "alpha beta gamma"));
assert.equal(hashShingle(83, "shingle words here"), expectedFold(83, "shingle words here"));
assert.equal(hashShingle(0, "a b c d e f g h"), hashShingle(0, "a b c d e f g h"));
const values = new Set<number>();
for (let fn = 0; fn < HASH_FUNCTION_COUNT; fn++) {
  values.add(hashShingle(fn, "a b c d e f g h"));
}
assert.ok(values.size > 80, "different salts must mostly produce different sums");

// --- Sketch: control sums are per-row minima over shingles ---
// w1..w8 avoid the stop-word list; bare "a"/"h" would be canonicalized away.
const sketchA = buildSketch("w1 w2 w3 w4 w5 w6 w7 w8 w1 w2 w3 w4 w5 w6 w7 w8", { width: 8 });
assert.equal(sketchA.valid, true);
assert.equal(sketchA.tokens.length, 16);
assert.equal(sketchA.shingles.length, 9); // 16 − 8 + 1
assert.equal(sketchA.controlSums.length, HASH_FUNCTION_COUNT);
assert.equal(sketchA.controlSumSources.length, HASH_FUNCTION_COUNT);
assert.equal(
  sketchA.controlSums.every((sum) => sum > 0),
  true,
);

// --- Empty / short texts: no fabricated 100% similarity ---
const stopOnly = buildSketch("of the and is are", { width: 8 });
assert.equal(stopOnly.valid, false);
assert.equal(stopOnly.controlSums.length, 0);
const shortText = buildSketch("one two three four five six seven", { width: 8 });
assert.equal(shortText.valid, false);
assert.equal(shortText.shingles.length, 0);
assert.throws(() => compareSketches(stopOnly, stopOnly), EmptySketchError);
assert.throws(() => compareSketches(stopOnly, sketchA), EmptySketchError);
assert.throws(() => compareSketches(sketchA, stopOnly), EmptySketchError);
// A 1000-word source of stop words only still cannot be compared.
const emptyAfterCanonicalization = buildSketch("the ".repeat(1000), { width: 8 });
assert.equal(emptyAfterCanonicalization.valid, false);
assert.throws(
  () =>
    compareAllPairs([
      { name: "a", text: "", sketch: emptyAfterCanonicalization },
      { name: "b", text: "", sketch: emptyAfterCanonicalization },
    ]),
  EmptySketchError,
);

// --- Identical texts: similarity 100% ---
const text = Array.from({ length: 40 }, (_, i) => `word${i}`).join(" ");
const s1 = buildSketch(text, { width: 8 });
const s2 = buildSketch(text, { width: 8 });
const identical = compareSketches(s1, s2);
assert.equal(identical.matches, HASH_FUNCTION_COUNT);
assert.equal(identical.similarityPercent, 100);

// --- Disjoint texts: similarity 0% ---
const other = Array.from({ length: 40 }, (_, i) => `zebra${i}`).join(" ");
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
const punctComparison = compareSketches(
  buildSketch(withPunct, { width: 8 }),
  buildSketch(base, { width: 8 }),
);
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

// --- Duplicate identity is content-based, not filename-based ---
assert.equal(contentKey("Hello  WORLD\n"), contentKey("hello world"));
assert.notEqual(contentKey("hello world"), contentKey("hello worlds"));

// --- 1000-word boundary ---
const words1000 = Array.from({ length: 1000 }, (_, i) => `w${i}`).join(" ");
assert.equal(countEnglishWords(words1000), 1000);
assert.equal(countEnglishWords(words1000 + " extra"), 1001);
assert.equal(countEnglishWords(words1000.split(" ").slice(0, 999).join(" ")), 999);

console.log("lab 3 shingles tests passed ✓");
