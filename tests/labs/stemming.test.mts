/**
 * Lab 2 (dictionary-based stemming) tests: the manual's method — exact
 * dictionary match, then longest-prefix fallback ("анализ начинается с начала
 * слова"), missing words left unchanged, structure-preserving output.
 * Boundaries: 100-word minimum, case/punctuation, hyphens, empty input.
 */

import assert from "node:assert/strict";
import {
  countWords,
  findTokenSpans,
  lookupStem,
  renderStemmedText,
  stemText,
} from "../../src/lib/labs/stemming/stemming.ts";

// --- Single-word lookups ---
assert.deepEqual(lookupStem("документы"), {
  source: "документы",
  lookup: "документы",
  stem: "документ",
  match: "exact",
});
assert.deepEqual(lookupStem("Документами"), {
  source: "Документами",
  lookup: "документами",
  stem: "документ",
  match: "exact",
});
// Word absent from the dictionary, but a dictionary stem prefixes it.
assert.equal(lookupStem("информационности").match, "prefix");
assert.equal(lookupStem("информационности").stem, "информ");
// Word with no dictionary relation at all.
assert.equal(lookupStem("ксилофон").match, "none");
assert.equal(lookupStem("ксилофон").stem, null);
// Case-insensitive lookup, original casing preserved in `source`.
assert.equal(lookupStem("ИНДЕКСА").stem, "индекс");

// --- 100-word boundary ---
function makeWords(n: number): string {
  const words = ["документ", "документа", "индексы", "поиска", "система"];
  const parts: string[] = [];
  for (let i = 0; i < n; i++) parts.push(words[i % words.length]);
  return parts.join(" ");
}

const atBoundary = stemText(makeWords(100));
assert.equal(atBoundary.totalWords, 100);
assert.equal(atBoundary.matched, 100, "all sample words are in the dictionary");

const belowBoundary = makeWords(99);
assert.equal(countWords(belowBoundary), 99);

// --- Full-text formatting and punctuation ---
const sample = "Документы, индексы и системы!\nПоиск документа; документ-база.";
const result = stemText(sample);
// 7 tokens: «документ-база» is a single hyphenated token.
assert.equal(result.totalWords, 7);
// «и» is not in the dictionary (stop words stay unmatched); the rest hit.
assert.equal(result.matched, 6);
assert.equal(result.missed, 1);
// Rebuilt text preserves punctuation, whitespace, line breaks, and unmatched words.
const rendered = renderStemmedText(sample, result);
assert.equal(rendered, "документ, индекс и систем!\nпоиск документ; документ-баз.");
// The source text itself is never mutated.
assert.equal(sample, "Документы, индексы и системы!\nПоиск документа; документ-база.");

// --- Empty and non-letter input ---
assert.equal(stemText("").totalWords, 0);
assert.equal(stemText("123 456 !!! ...").totalWords, 0);
assert.equal(stemText("…").totalWords, 0);
assert.deepEqual(findTokenSpans("  \n\t "), []);

// --- Hyphenated words: parts looked up independently ---
const hyphen = stemText("по-русски кто-то");
assert.equal(hyphen.words[0].source, "по-русски");
assert.equal(hyphen.words[0].stem, null); // neither part is in the dictionary
assert.equal(hyphen.words[1].stem, null);

// --- Word-by-word mapping evidence ---
const table = stemText("документы документами");
assert.deepEqual(
  table.words.map((w) => [w.source, w.stem, w.match]),
  [
    ["документы", "документ", "exact"],
    ["документами", "документ", "exact"],
  ],
);
assert.deepEqual(table.uniqueStems, ["документ"]);

// --- Dictionary-missing words in a full text stay readable ---
const withMisses = stemText("документ ксилофоном индекс");
assert.equal(withMisses.totalWords, 3);
assert.equal(withMisses.matched, 2);
assert.equal(withMisses.missed, 1);
// A missing word passes through unchanged.
assert.equal(
  renderStemmedText("документ ксилофоном индекс", withMisses),
  "документ ксилофоном индекс",
);

console.log("lab 2 dictionary stemming tests passed ✓");
