/**
 * Lab 1 regression tests: the demo collection still meets the assignment
 * contract (100 documents × ≥1000 words, deterministic), the tokenization /
 * stop-word behavior is unchanged, the deliberately extended stemmer merges
 * neuter -о forms, and the view dispatch layer routes every implemented lab
 * folder to its own view.
 */

import assert from "node:assert/strict";
import {
  removeStopWords,
  stem,
  tokenizeAndNormalize,
} from "../../src/lib/labs/inverted-index/text-processing.ts";
import { generateDemoCollection } from "../../src/lib/labs/inverted-index/demo-texts.ts";
import { InvertedIndexBuilder } from "../../src/lib/labs/inverted-index/inverted-index-builder.ts";
import type { Document } from "../../src/lib/labs/inverted-index/models.ts";
import { toCorpus } from "../../src/lib/labs/shared/lab1-corpus.ts";
import { getLabView } from "../../src/lib/labs/lab-views.ts";

// --- Tokenization / stop-word snapshots (unchanged) ---
assert.equal(stem("кошки"), "кошк");
assert.equal(stem("документов"), "документов"); // "ов" not in suffix list
assert.deepEqual(tokenizeAndNormalize("Кошка — кошки, КОШКА!"), ["кошк", "кошк", "кошк"]);
assert.deepEqual(tokenizeAndNormalize("документ123документ"), ["документ", "документ"]);
assert.deepEqual(removeStopWords(["кошк", "и", "в", "документ", "на"]), ["кошк", "документ"]);

// --- Deliberate stemmer deviation: neuter -о merges with oblique forms ---
assert.equal(stem("небо"), "неб");
assert.equal(stem("небе"), "неб");
assert.equal(stem("неба"), "неб");
assert.equal(stem("ма"), "ма"); // guard `length > suffix.length + 2` intact
// Residual naive-stemmer limitation (documented, acceptable for the corpus).
assert.equal(stem("метро"), stem("метр"), "«метро» over-merges with «метр»");

// --- Demo collection contract ---
const sources = generateDemoCollection();
assert.equal(sources.length, 100);
const texts = await Promise.all(sources.map((s) => s.read()));
const wordsPerDoc = texts.map((t) => t.split(/\s+/).filter(Boolean).length);
assert.ok(
  wordsPerDoc.every((n) => n >= 1000),
  "каждый демо-документ ≥ 1000 слов",
);
const sources2 = generateDemoCollection();
assert.equal(await sources2[0].read(), texts[0], "генерация детерминирована");

// --- Index build parity over the demo corpus ---
const demoDocs: Document[] = texts.map((rawText, i) => ({
  id: i + 1,
  name: sources[i].name,
  rawText,
}));
const demoIndex = await new InvertedIndexBuilder().build(demoDocs);
assert.ok(demoIndex.size > 0);
let totalTokens = 0;
for (const info of demoIndex.values()) totalTokens += info.collectionFrequency;
assert.ok(totalTokens > 80_000, `ожидается большой корпус, получено ${totalTokens}`);

// --- Corpus accessor: plain snapshot, no reactive leakage ---
const corpus = toCorpus(demoDocs);
assert.equal(corpus.length, 100);
assert.ok(corpus.every((doc) => typeof doc.id === "number" && typeof doc.text === "string"));
assert.ok(
  !("postings" in corpus[0]) && !("rawText" in corpus[0]),
  "no Lab 1 internals leak through",
);
// The snapshot is detached: mutating it cannot touch the source documents.
corpus[0].text = "changed";
assert.equal(demoDocs[0].rawText, texts[0]);

// --- View dispatch: every registered lab maps to its own view ---
// Under plain Bun, .svelte imports resolve to module values (no component
// render); these assertions verify the folder→view registration and that
// no two labs accidentally share one view component.
assert.ok(getLabView("inverted-index"), "lab 1 view registered");
assert.ok(getLabView("stemming"), "lab 2 view registered");
assert.ok(getLabView("shingles"), "lab 3 view registered");
assert.ok(getLabView("search-quality"), "lab 4 view registered");
assert.notEqual(getLabView("inverted-index"), getLabView("stemming"));
assert.notEqual(getLabView("shingles"), getLabView("search-quality"));
assert.equal(getLabView("unknown-folder"), undefined, "unknown folder shows the placeholder");

console.log("lab 1 regression + dispatch tests passed ✓");
