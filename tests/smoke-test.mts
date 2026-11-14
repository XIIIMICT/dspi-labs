/**
 * Smoke test for the TypeScript port of the lab logic: stemming,
 * tokenization, stop words, inverted index construction, and the demo
 * collection generator. Expected values are derived from the original
 * Kotlin code (TextProcessing.kt, InvertedIndexBuilder.kt).
 */

import assert from "node:assert/strict";
import {
  stem,
  tokenizeAndNormalize,
  removeStopWords,
} from "../src/lib/labs/inverted-index/text-processing.ts";
import { InvertedIndexBuilder } from "../src/lib/labs/inverted-index/inverted-index-builder.ts";
import { generateDemoCollection } from "../src/lib/labs/inverted-index/demo-texts.ts";
import type { Document } from "../src/lib/labs/inverted-index/models.ts";

// --- Stemming (port of stem(): suffix iteration, strip when remainder > 2) ---
assert.equal(stem("кошки"), "кошк"); // "ы" is stripped
assert.equal(stem("кошка"), "кошк"); // "а" is stripped
assert.equal(stem("кошке"), "кошк"); // "е" is stripped
assert.equal(stem("кош"), "кош"); // remainder 3 > 2 — untouched
assert.equal(stem("ма"), "ма"); // len 2 <= suffix.len + 2 — "а" NOT stripped
assert.equal(stem("документы"), "документ");
assert.equal(stem("документа"), "документ");
assert.equal(stem("документом"), "документ"); // "ом" is stripped
assert.equal(stem("документе"), "документ");
assert.equal(stem("документов"), "документов"); // "ов" is not in the suffix list — as in the original
assert.equal(stem("системы"), "систем");
assert.equal(stem("словами"), "слов"); // "ами" is stripped (7 > 3 + 2)

// --- Tokenization and normalization ---
assert.deepEqual(tokenizeAndNormalize("Кошка — кошки, КОШКА!"), ["кошк", "кошк", "кошк"]);
assert.deepEqual(tokenizeAndNormalize("документ123документ"), ["документ", "документ"]); // digits are separators
assert.deepEqual(tokenizeAndNormalize(""), []);

// --- Stop words ---
assert.deepEqual(removeStopWords(["кошк", "и", "в", "документ", "на"]), ["кошк", "документ"]);
assert.deepEqual(removeStopWords(["и", "в", "на"]), []);

// --- Inverted index ---
const docA: Document = {
  id: 1,
  name: "a.txt",
  path: "a.txt",
  rawText: "кошка и кошка в документе. Кошки!",
};
const docB: Document = {
  id: 2,
  name: "b.txt",
  path: "b.txt",
  rawText: "документ и система документов",
};

const log: string[] = [];
const builder = new InvertedIndexBuilder();
const index = await builder.build([docA, docB], (m) => log.push(m));

assert.ok(index.get("кошк"), "стем «кошк» должен быть в индексе");
const catInfo = index.get("кошк")!;
assert.equal(catInfo.term, "кошк");
assert.equal(catInfo.docFrequency, 1); // document 1 only
assert.equal(catInfo.collectionFrequency, 3); // кошка, кошка, Кошки
assert.deepEqual(catInfo.postings[0].positions, [0, 1, 3]); // indices AFTER stop-word removal

const docInfo = index.get("документ")!;
assert.equal(docInfo.docFrequency, 2); // both documents
assert.equal(docInfo.collectionFrequency, 2);
assert.equal(docInfo.postings[0].termFrequency, 1);
// "документе" → "документ" (doc 1), "документ" (doc 2); "документов" does not reduce
assert.ok(index.get("документов"), "«документов» остаётся отдельным стемом (как в оригинале)");
assert.ok(index.get("систем"));

// Log messages — as in the original loadFromUris/build
assert.ok(log.includes("Начало построения индекса для 2 документов"));
assert.ok(log.includes(" - Токенизация завершена: 6 токенов")); // кошка и кошка в документе кошки
assert.ok(log.includes(" - Удалены стоп-слова: 4 токенов осталось")); // 6 − 2 stop words
assert.ok(log.includes("Построение индекса завершено. Всего терминов: 4")); // кошк, документ, систем, документов

// --- Demo collection: determinism and word counts required by the task ---
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

// End-to-end index build over the whole demo collection (browser-run parity)
const demoDocs: Document[] = texts.map((rawText, i) => ({
  id: i + 1,
  name: sources[i].name,
  path: sources[i].path,
  rawText,
}));
const demoIndex = await new InvertedIndexBuilder().build(demoDocs);
let totalTokens = 0;
for (const info of demoIndex.values()) totalTokens += info.collectionFrequency;

console.log(`Демо-коллекция: 100 документов, ${wordsPerDoc[0]}+ слов в каждом`);
console.log(`Индекс: ${demoIndex.size} терминов, ${totalTokens} токенов`);
console.log(
  `Топ-5 терминов: ${[...demoIndex.values()]
    .sort((a, b) => b.collectionFrequency - a.collectionFrequency)
    .slice(0, 5)
    .map((t) => `${t.term}(${t.collectionFrequency})`)
    .join(", ")}`,
);
console.log("Все проверки пройдены ✓");
