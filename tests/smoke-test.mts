/**
 * Smoke-тест портированной на TypeScript логики лабораторной работы:
 * стемминг, токенизация, стоп-слова, построение инвертированного индекса
 * и генератор демо-коллекции. Ожидаемые значения выведены из логики
 * исходного Kotlin-кода (TextProcessing.kt, InvertedIndexBuilder.kt).
 */

import assert from 'node:assert/strict';
import { stem, tokenizeAndNormalize, removeStopWords } from '../src/lib/lab/text-processing.ts';
import { InvertedIndexBuilder } from '../src/lib/lab/inverted-index-builder.ts';
import { generateDemoCollection } from '../src/lib/lab/demo-texts.ts';
import type { Document } from '../src/lib/lab/models.ts';

// --- Стемминг (порт stem(): перебор суффиксов, обрезка при остатке > 2) ---
assert.equal(stem('кошки'), 'кошк'); // «ы» срезается
assert.equal(stem('кошка'), 'кошк'); // «а» срезается
assert.equal(stem('кошке'), 'кошк'); // «е» срезается
assert.equal(stem('кош'), 'кош'); // остаток 3 > 2 — не трогаем
assert.equal(stem('ма'), 'ма'); // len 2 <= suffix.len + 2 — «а» НЕ срезается
assert.equal(stem('документы'), 'документ');
assert.equal(stem('документа'), 'документ');
assert.equal(stem('документом'), 'документ'); // «ом» срезается
assert.equal(stem('документе'), 'документ');
assert.equal(stem('документов'), 'документов'); // «ов» нет в списке суффиксов — как в оригинале
assert.equal(stem('системы'), 'систем');
assert.equal(stem('словами'), 'слов'); // «ами» срезается (7 > 3 + 2)

// --- Токенизация и нормализация ---
assert.deepEqual(tokenizeAndNormalize('Кошка — кошки, КОШКА!'), ['кошк', 'кошк', 'кошк']);
assert.deepEqual(tokenizeAndNormalize('документ123документ'), ['документ', 'документ']); // цифры — разделители
assert.deepEqual(tokenizeAndNormalize(''), []);

// --- Стоп-слова ---
assert.deepEqual(removeStopWords(['кошк', 'и', 'в', 'документ', 'на']), ['кошк', 'документ']);
assert.deepEqual(removeStopWords(['и', 'в', 'на']), []);

// --- Инвертированный индекс ---
const docA: Document = {
	id: 1,
	name: 'a.txt',
	path: 'a.txt',
	rawText: 'кошка и кошка в документе. Кошки!',
};
const docB: Document = {
	id: 2,
	name: 'b.txt',
	path: 'b.txt',
	rawText: 'документ и система документов',
};

const log: string[] = [];
const builder = new InvertedIndexBuilder();
const index = await builder.build([docA, docB], (m) => log.push(m));

assert.ok(index.get('кошк'), 'стем «кошк» должен быть в индексе');
const catInfo = index.get('кошк')!;
assert.equal(catInfo.term, 'кошк');
assert.equal(catInfo.docFrequency, 1); // только документ 1
assert.equal(catInfo.collectionFrequency, 3); // кошка, кошка, Кошки
assert.deepEqual(catInfo.postings[0].positions, [0, 1, 3]); // индексы в списке ПОСЛЕ удаления стоп-слов

const docInfo = index.get('документ')!;
assert.equal(docInfo.docFrequency, 2); // оба документа
assert.equal(docInfo.collectionFrequency, 2);
assert.equal(docInfo.postings[0].termFrequency, 1);
// «документе» → «документ» (док 1), «документ» (док 2); «документов» не сводится
assert.ok(index.get('документов'), '«документов» остаётся отдельным стемом (как в оригинале)');
assert.ok(index.get('систем'));

// Сообщения журнала — как в loadFromUris/build оригинала
assert.ok(log.includes('Начало построения индекса для 2 документов'));
assert.ok(log.includes(' - Токенизация завершена: 6 токенов')); // кошка и кошка в документе кошки
assert.ok(log.includes(' - Удалены стоп-слова: 4 токенов осталось')); // 6 − 2 стоп-слова
assert.ok(log.includes('Построение индекса завершено. Всего терминов: 4')); // кошк, документ, систем, документов

// --- Демо-коллекция: детерминированность и объёмы как в задании ---
const sources = generateDemoCollection();
assert.equal(sources.length, 100);
const texts = await Promise.all(sources.map((s) => s.read()));
const wordsPerDoc = texts.map((t) => t.split(/\s+/).filter(Boolean).length);
assert.ok(wordsPerDoc.every((n) => n >= 1000), 'каждый демо-документ ≥ 1000 слов');
const sources2 = generateDemoCollection();
assert.equal((await sources2[0].read()), texts[0], 'генерация детерминирована');

// Сквозная сборка индекса по всей демо-коллекции (сверка с браузерным прогоном)
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
console.log(`Топ-5 терминов: ${[...demoIndex.values()]
	.sort((a, b) => b.collectionFrequency - a.collectionFrequency)
	.slice(0, 5)
	.map((t) => `${t.term}(${t.collectionFrequency})`)
	.join(', ')}`);
console.log('Все проверки пройдены ✓');
