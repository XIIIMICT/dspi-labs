/**
 * Lab 1 tests: collection-level validation (100 docs × ≥1000 linguistic
 * words, unsupported/unreadable/duplicate sources, non-destructive failure),
 * the explicit hybrid linked fixed-capacity block storage, alphabetical
 * term ordering, and repeat diagnostics. Ported tokenizer/stemmer snapshots
 * stay in the smoke/regression tests — they must remain unchanged.
 */

import assert from "node:assert/strict";
import {
  MIN_WORDS_PER_DOCUMENT,
  REQUIRED_DOCUMENTS,
  collectionDiagnostics,
  countLinguisticWords,
  isSupportedTextFile,
  validateCollection,
  type CollectionSource,
} from "../../src/lib/labs/inverted-index/collection-validation.ts";
import {
  BLOCK_CAPACITY,
  appendPosition,
  createHybridTerm,
  flattenTermInfo,
  iteratePositions,
  type HybridTerm,
} from "../../src/lib/labs/inverted-index/hybrid-storage.ts";
import { InvertedIndexBuilder } from "../../src/lib/labs/inverted-index/inverted-index-builder.ts";
import { stem, tokenizeAndNormalize } from "../../src/lib/labs/inverted-index/text-processing.ts";
import type { Document } from "../../src/lib/labs/inverted-index/models.ts";

// --- Word-counting rule: linguistic tokens, not whitespace fragments ---
assert.equal(countLinguisticWords("кошка, кошка! документ123текст"), 4);
assert.equal(countLinguisticWords(""), 0);
assert.equal(countLinguisticWords("123 !!! …"), 0);
assert.ok(isSupportedTextFile("a.TXT", ""));
assert.ok(isSupportedTextFile("notes", "text/plain"));
assert.equal(isSupportedTextFile("image.png", "image/png"), false);
assert.equal(isSupportedTextFile("data.pdf", ""), false);

// --- Collection validation helpers ---
function source(name: string, words: number): CollectionSource {
  // Distinct filler words per source so content duplicates are explicit tests.
  return {
    name,
    path: name,
    read: async () => Array.from({ length: words }, (_, i) => `${name}${i}`).join(" "),
  };
}
function validSources(n: number): CollectionSource[] {
  return Array.from({ length: n }, (_, i) => source(`doc${i}`, MIN_WORDS_PER_DOCUMENT));
}

const ok = await validateCollection(validSources(REQUIRED_DOCUMENTS));
assert.equal(ok.errors.length, 0);
assert.equal(ok.documents.length, REQUIRED_DOCUMENTS);
assert.deepEqual(
  ok.documents.map((d) => d.id),
  Array.from({ length: REQUIRED_DOCUMENTS }, (_, i) => i + 1),
);

const tooFew = await validateCollection(validSources(99));
assert.equal(tooFew.errors.length > 0, true);
assert.ok(tooFew.errors.some((e) => /ровно 100 документов/.test(e)));
const tooMany = await validateCollection(validSources(101));
assert.equal(tooMany.errors.length > 0, true);

// 999/1000 boundary.
const short = await validateCollection([
  ...validSources(99),
  source("short", MIN_WORDS_PER_DOCUMENT - 1),
]);
assert.ok(short.errors.some((e) => /999 слов/.test(e)));
const exact = await validateCollection([
  ...validSources(99),
  source("exact", MIN_WORDS_PER_DOCUMENT),
]);
assert.equal(exact.errors.length, 0);
assert.equal(exact.documents.length, 100);

// Empty and unreadable sources.
const withEmpty = await validateCollection([
  ...validSources(99),
  { name: "empty.txt", path: "empty.txt", read: async () => "   \n  " },
]);
assert.ok(withEmpty.errors.some((e) => /не содержит слов/.test(e)));
const withBroken = await validateCollection([
  ...validSources(99),
  {
    name: "broken.txt",
    path: "broken.txt",
    read: async () => {
      throw new Error("disk read failed");
    },
  },
]);
assert.ok(withBroken.errors.some((e) => /Не удалось прочитать/.test(e)));

// Duplicate content under different names.
const dupSources: CollectionSource[] = [
  ...validSources(98),
  { name: "dup1.txt", path: "dup1.txt", read: async () => "same ".repeat(1200) },
  { name: "dup2.txt", path: "dup2.txt", read: async () => "same ".repeat(1200) },
];
const dup = await validateCollection(dupSources);
assert.ok(dup.errors.some((e) => /дублирует содержимое/.test(e)));

// Stable IDs: no gaps when a middle source is rejected.
const mixed = await validateCollection([
  source("a", MIN_WORDS_PER_DOCUMENT),
  source("bad", 10),
  source("c", MIN_WORDS_PER_DOCUMENT),
]);
assert.deepEqual(
  mixed.documents.map((d) => [d.id, d.name]),
  [
    [1, "a"],
    [2, "c"],
  ],
);
assert.equal(mixed.errors.length > 0, true);

// --- Hybrid storage: linked chain of fixed-capacity blocks ---
const hybrid: HybridTerm = createHybridTerm("кошк");
// One document, 2*BLOCK_CAPACITY+1 positions → 3 blocks (rollover).
const positionCount = BLOCK_CAPACITY * 2 + 1;
for (let p = 0; p < positionCount; p++) appendPosition(hybrid, 1, p);
assert.equal(hybrid.collectionFrequency, positionCount);
assert.equal(hybrid.docFrequency, 1);
assert.equal(hybrid.postings.get(1)!.termFrequency, positionCount);

// Linked chain: count blocks, check capacity and the single tail.
let blocks = 0;
let node = hybrid.head;
let tailCount = -1;
while (node !== null) {
  blocks += 1;
  assert.ok(node.count <= BLOCK_CAPACITY, "block must not exceed fixed capacity");
  assert.ok(node.items.length === BLOCK_CAPACITY, "block array has fixed length");
  tailCount = node.count;
  node = node.next;
}
assert.equal(blocks, 3);
assert.equal(tailCount, 1);
assert.equal(hybrid.tail?.next, null);
assert.deepEqual(
  [...iteratePositions(hybrid.head)],
  Array.from({ length: positionCount }, (_, i) => i),
);

// Multiple documents, repeated occurrences, ordering, flatten adapter.
const multi = createHybridTerm("документ");
[0, 1, 2, 3, 4].forEach((p) => appendPosition(multi, 1, p));
[10, 11].forEach((p) => appendPosition(multi, 2, p));
appendPosition(multi, 1, 5);
const flat = flattenTermInfo(multi);
assert.equal(flat.docFrequency, 2);
assert.equal(flat.collectionFrequency, 8);
assert.equal(flat.postings.length, 2);
assert.deepEqual(flat.postings[0], {
  docId: 1,
  termFrequency: 6,
  positions: [0, 1, 2, 3, 4, 5],
});
assert.deepEqual(flat.postings[1], {
  docId: 2,
  termFrequency: 2,
  positions: [10, 11],
});

// Builder produces the same flat contract from the hybrid structure.
const docs: Document[] = [
  { id: 1, name: "a.txt", path: "a.txt", rawText: "кошка и кошка в документе. Кошки!" },
  { id: 2, name: "b.txt", path: "b.txt", rawText: "документ и система документов" },
];
const builder = new InvertedIndexBuilder();
const index = await builder.build(docs);
const cat = index.get("кошк")!;
assert.equal(cat.docFrequency, 1);
assert.equal(cat.collectionFrequency, 3);
assert.deepEqual(cat.postings[0].positions, [0, 1, 3]);
assert.equal(cat.postings[0].termFrequency, 3);
// The hybrid structure itself is inspectable and block-based.
assert.ok(builder.hybridDictionary.get("кошк")!.head !== null);

// --- Alphabetical term output: the real shared helper, not a local re-sort ---
import {
  compareTerms,
  sortTermsAlphabetically,
} from "../../src/lib/labs/inverted-index/sort-terms.ts";

// Deliberately unsorted input, including Cyrillic/Ё representatives.
const unsorted = ["яблоко", "Документ", "ёж", "алгоритм", "Ель", "база", "Азбука"];
assert.deepEqual(sortTermsAlphabetically(unsorted), [
  "Азбука",
  "алгоритм",
  "база",
  "Документ",
  "ёж",
  "Ель",
  "яблоко",
]);
assert.ok(compareTerms("алгоритм", "база") < 0);
assert.ok(compareTerms("Ель", "ёж") !== 0); // ё is a distinct letter, not silently merged
// The index view sorts by the very same comparator.
assert.deepEqual(
  [...index.values()].map((info) => info.term).sort(compareTerms),
  sortTermsAlphabetically([...index.values()].map((info) => info.term)),
);

// --- Inspectable diagnostics (not a proof of thematic similarity) ---
const diag = collectionDiagnostics(
  [
    { name: "a", rawText: "кошка кошка документ" },
    { name: "b", rawText: "документ система кошка" },
  ],
  (w) => stem(w),
  tokenizeAndNormalize,
);
assert.equal(diag.repeatedWithinDocuments[0].terms.includes("кошк"), true);
assert.deepEqual(diag.sharedAcrossDocuments, ["документ", "кошк"]);

console.log("lab 1 validation + hybrid storage tests passed ✓");
