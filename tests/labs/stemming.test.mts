/**
 * Lab 2 (dictionary-based stemming) tests: exact dictionary match, then the
 * longest-prefix fallback (this app's interpretation of «анализ начинается с
 * начала слова»), missing words left unchanged, structure/casing-preserving
 * output, honest hyphenated match aggregation.
 * Boundaries: 100-word minimum, case/punctuation, hyphens, empty input.
 */

import assert from "node:assert/strict";
import { stemDictionary } from "../../src/lib/labs/stemming/dictionary.ts";
import {
  aggregateMatch,
  countWords,
  findTokenSpans,
  lookupHyphenated,
  lookupStem,
  matchCasing,
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

// --- Full-text formatting, punctuation, and CASE PRESERVATION ---
const sample = "Документы, индексы и системы!\nПоиск документа; документ-база.";
const result = stemText(sample);
// 7 tokens: «документ-база» is a single hyphenated token.
assert.equal(result.totalWords, 7);
// «и» is not in the dictionary (stop words stay unmatched); the rest hit.
assert.equal(result.matched, 6);
assert.equal(result.missed, 1);
// Rebuilt text preserves punctuation, whitespace, line breaks, unmatched
// words byte-for-byte, and matched words keep their original casing.
const rendered = renderStemmedText(sample, result);
assert.equal(rendered, "Документ, индекс и систем!\nПоиск документ; документ-баз.");
// The source text itself is never mutated.
assert.equal(sample, "Документы, индексы и системы!\nПоиск документа; документ-база.");

// --- Casing helper: lowercase / Initial capital / ALL CAPS ---
assert.equal(matchCasing("документы", "документ"), "документ");
assert.equal(matchCasing("Документы", "документ"), "Документ");
assert.equal(matchCasing("ДОКУМЕНТЫ", "документ"), "ДОКУМЕНТ");
assert.equal(matchCasing("дОкУмЕнТы", "документ"), "документ"); // mixed → lowercase
const cased = stemText("Документы ДОКУМЕНТЫ документы КСИЛОФОН");
assert.equal(
  renderStemmedText("Документы ДОКУМЕНТЫ документы КСИЛОФОН", cased),
  "Документ ДОКУМЕНТ документ КСИЛОФОН",
);

// --- Empty and non-letter input ---
assert.equal(stemText("").totalWords, 0);
assert.equal(stemText("123 456 !!! ...").totalWords, 0);
assert.equal(stemText("…").totalWords, 0);
assert.deepEqual(findTokenSpans("  \n\t "), []);

// --- Hyphenated words: parts looked up independently, honest match status ---
const hyphen = stemText("по-русски кто-то");
assert.equal(hyphen.words[0].source, "по-русски");
assert.equal(hyphen.words[0].stem, null); // neither part is in the dictionary
assert.equal(hyphen.words[0].match, "none"); // no fabricated "prefix"
assert.equal(hyphen.words[1].stem, null);
assert.equal(hyphen.words[1].match, "none");

// Exact + exact → exact; exact + prefix → prefix; partial miss → prefix;
// all miss → none.
const allExact = lookupHyphenated("документ-индекс");
assert.equal(aggregateMatch(allExact), "exact");
assert.equal(aggregateMatch(lookupHyphenated("документ-информационности")), "prefix");
assert.equal(aggregateMatch(lookupHyphenated("документ-ксилофон")), "prefix");
assert.equal(aggregateMatch(lookupHyphenated("ксилофон-баян")), "none");
assert.equal(stemText("документ-ксилофон").words[0].match, "prefix");
assert.equal(stemText("ксилофон-баян").words[0].match, "none");
assert.equal(stemText("ксилофон-баян").words[0].stem, null);

// --- One-letter hyphen parts are skipped, never a dictionary "hit" ---
assert.deepEqual(
  lookupHyphenated("а-ксилофон").map((p) => [p.source, p.stem, p.match]),
  [
    ["а", null, "none"],
    ["ксилофон", null, "none"],
  ],
);
const shortPartUnknown = stemText("а-ксилофон");
assert.equal(shortPartUnknown.words[0].stem, null);
assert.equal(shortPartUnknown.words[0].match, "none");
assert.equal(shortPartUnknown.matched, 0);
assert.equal(renderStemmedText("а-ксилофон", shortPartUnknown), "а-ксилофон");
const shortPartKnown = stemText("документ-б");
assert.deepEqual(
  lookupHyphenated("документ-б").map((p) => p.match),
  ["exact", "none"],
);
assert.equal(shortPartKnown.words[0].stem, "документ-б"); // original part preserved
assert.equal(shortPartKnown.words[0].match, "prefix"); // honest: not all-exact
assert.equal(shortPartKnown.matched, 1); // one word matched, not two "hits"
assert.equal(renderStemmedText("документ-б", shortPartKnown), "документ-б");
// Ordinary compound whose parts are both genuinely looked up.
assert.equal(stemText("документ-индекс").words[0].match, "exact");

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
assert.equal(
  renderStemmedText("документ ксилофоном индекс", withMisses),
  "документ ксилофоном индекс",
);

// --- Dictionary asset invariants: plain single lowercase Russian words only ---
// Guards against tokenizer-unreachable keys (spaces) and stress-marked
// entries (U+0301 combining accent) that would never match or render garbage.
const singleWordPattern = /^[а-яё]+(?:-[а-яё]+)*$/;
for (const [key, value] of Object.entries(stemDictionary.entries)) {
  assert.match(key, singleWordPattern, `dictionary key must be a plain single word: ${key}`);
  assert.match(
    value,
    singleWordPattern,
    `dictionary stem must be a plain word: ${key} -> ${value}`,
  );
}

// The former dead keys now behave as ordinary single-word lookups.
assert.deepEqual(lookupStem("людях"), {
  source: "людях",
  lookup: "людях",
  stem: "человек",
  match: "exact",
});
assert.equal(lookupStem("сравнение").stem, "сравнен");
assert.equal(lookupStem("числах").stem, "числ");
assert.equal(lookupStem("выть").stem, "вы");

// --- Extended dictionary families (representative, hand-curated) ---
assert.deepEqual(
  ["текст", "текста", "тексту", "текстом", "текстах", "тексты"].map((w) => lookupStem(w).stem),
  ["текст", "текст", "текст", "текст", "текст", "текст"],
);
assert.equal(lookupStem("города").stem, "город");
assert.equal(lookupStem("нового").stem, "нов");
assert.equal(lookupStem("большие").stem, "больш");
assert.equal(lookupStem("пишут").stem, "писа");
assert.equal(lookupStem("написали").stem, "писа");
assert.equal(lookupStem("разработчики").stem, "разработчик");
// Prefix fallback and casing still work with the wider dictionary.
assert.equal(lookupStem("информационности").match, "prefix");
assert.equal(lookupStem("информационности").stem, "информ");
const casedFamily = stemText("Нового города пишут запросы");
assert.equal(
  renderStemmedText("Нового города пишут запросы", casedFamily),
  "Нов город писа запрос",
);
// A hyphenated compound whose parts exist is looked up independently.
assert.equal(stemText("текст-документ").words[0].match, "exact");

console.log("lab 2 dictionary stemming tests passed ✓");
