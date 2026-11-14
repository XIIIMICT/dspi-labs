/**
 * Lab 4 (search quality) tests: hand-computed confusion examples for each
 * metric, zero-denominator rules, exact sample sizes {2,4,6,8,10} as N
 * CANDIDATES (query separate, a+b+c+d === N), stable ID-based sketch cache,
 * duplicate filenames, chart data from computed values, and evidence-based
 * conclusions.
 */

import assert from "node:assert/strict";
import {
  buildConclusions,
  runExperiment,
  SAMPLE_SIZES,
  type EvaluationDocument,
} from "../../src/lib/labs/search-quality/experiment.ts";
import {
  buildConfusion,
  computeMetrics,
  fraction,
} from "../../src/lib/labs/search-quality/metrics.ts";

// --- Hand-computed metrics ---
// a=3, b=1, c=2, d=4  →  P = 3/4, R = 3/5, Fallout = 1/5, F1 = 2PR/(P+R)
const m = computeMetrics({
  retrievedRelevant: 3,
  retrievedNonRelevant: 1,
  missedRelevant: 2,
  missedNonRelevant: 4,
});
assert.equal(m.precision, 0.75);
assert.equal(m.recall, 0.6);
assert.equal(m.fallout, 1 / 5);
assert.ok(Math.abs(m.f1 - (2 * 0.75 * 0.6) / (0.75 + 0.6)) < 1e-12);
assert.ok(Math.abs(m.f1 - 2 / 3) < 1e-12);

// All relevant retrieved: perfect scores.
const perfect = computeMetrics({
  retrievedRelevant: 5,
  retrievedNonRelevant: 0,
  missedRelevant: 0,
  missedNonRelevant: 5,
});
assert.equal(perfect.precision, 1);
assert.equal(perfect.recall, 1);
assert.equal(perfect.fallout, 0);
assert.equal(perfect.f1, 1);

// --- Zero-denominator rules (application convention) ---
const noRetrieved = computeMetrics({
  retrievedRelevant: 0,
  retrievedNonRelevant: 0,
  missedRelevant: 4,
  missedNonRelevant: 6,
});
assert.equal(noRetrieved.precision, 0); // a + b = 0
assert.equal(noRetrieved.recall, 0);
assert.equal(noRetrieved.fallout, 0); // b + d = 6 → 0/6
assert.equal(noRetrieved.f1, 0); // P + R = 0
const noNonRelevant = computeMetrics({
  retrievedRelevant: 2,
  retrievedNonRelevant: 0,
  missedRelevant: 1,
  missedNonRelevant: 0,
});
assert.equal(noNonRelevant.fallout, 0); // b + d = 0 → 0
assert.equal(fraction(1, 0), 0);

// --- Confusion: d = missed NON-relevant (manual's table + Fallout formula) ---
assert.deepEqual(buildConfusion([true, true, false, false], [true, false, true, false]), {
  retrievedRelevant: 1,
  retrievedNonRelevant: 1,
  missedRelevant: 1,
  missedNonRelevant: 1,
});

// --- Experiment protocol ---
function textOf(seed: string, words: string[], count: number): string {
  const parts: string[] = [];
  for (let i = 0; i < count; i++) parts.push(words[i % words.length]);
  return `seed-${seed} ${parts.join(" ")}`;
}
const queryWords = Array.from({ length: 1200 }, (_, i) => `qword${i}`);
const queryText = queryWords.join(" ");
const relevantWords = [
  ...queryWords.slice(0, 600),
  ...Array.from({ length: 600 }, (_, i) => `rword${i}`),
];
const irrelevant = (n: number) => Array.from({ length: 1200 }, (_, i) => `x${n}word${i}`).join(" ");

// Query + 10 candidates. IDs are stable and independent of filenames.
const documents: EvaluationDocument[] = [
  { id: "q", name: "query.txt", text: queryText, relevant: true },
  { id: "r1", name: "rel1.txt", text: textOf("r1", relevantWords, 1200), relevant: true },
  { id: "r2", name: "rel2.txt", text: textOf("r2", relevantWords, 1200), relevant: true },
  { id: "r3", name: "rel3.txt", text: textOf("r3", relevantWords, 1200), relevant: true },
  { id: "r4", name: "rel4.txt", text: textOf("r4", relevantWords, 1200), relevant: true },
  { id: "i1", name: "irr1.txt", text: irrelevant(1), relevant: false },
  { id: "i2", name: "irr2.txt", text: irrelevant(2), relevant: false },
  { id: "i3", name: "irr3.txt", text: irrelevant(3), relevant: false },
  { id: "i4", name: "irr4.txt", text: irrelevant(4), relevant: false },
  { id: "i5", name: "irr5.txt", text: irrelevant(5), relevant: false },
  { id: "i6", name: "irr6.txt", text: irrelevant(6), relevant: false },
];

const result = runExperiment(documents, { width: 8, thresholdPercent: 10 });

// Exact sample sizes, in order.
assert.deepEqual(
  result.samples.map((s) => s.size),
  [...SAMPLE_SIZES],
);
assert.deepEqual([...SAMPLE_SIZES], [2, 4, 6, 8, 10]);

// Size N evaluates exactly N candidates: a+b+c+d === N, query excluded.
for (const sample of result.samples) {
  const sum =
    sample.counts.retrievedRelevant +
    sample.counts.retrievedNonRelevant +
    sample.counts.missedRelevant +
    sample.counts.missedNonRelevant;
  assert.equal(sample.documents.length, sample.size);
  assert.equal(sum, sample.size, `a+b+c+d must equal N for size ${sample.size}`);
  assert.ok(!sample.documents.some((d) => d.id === "q"), "query is never a result");
}
assert.deepEqual(
  result.samples[4].documents.map((d) => d.id),
  ["r1", "r2", "r3", "r4", "i1", "i2", "i3", "i4", "i5", "i6"],
);

// Relevant docs share 600/1200 words with the query → high similarity.
assert.equal(
  result.samples[4].documents[0].similarityPercent,
  result.samples[4].documents[3].similarityPercent,
);
assert.equal(result.samples[4].documents[5].similarityPercent, 0);

// Counts derive from labels × decisions at threshold 10%.
for (const sample of result.samples) {
  const expected = buildConfusion(
    sample.documents.map((d) => d.relevant),
    sample.documents.map((d) => d.retrieved),
  );
  assert.deepEqual(sample.counts, expected);
}
// At size 6 (4 relevant + 2 irrelevant): all 4 relevant retrieved,
// both irrelevant not → a=4, b=0, c=0, d=2.
assert.deepEqual(result.samples[2].counts, {
  retrievedRelevant: 4,
  retrievedNonRelevant: 0,
  missedRelevant: 0,
  missedNonRelevant: 2,
});
assert.equal(result.samples[2].metrics.precision, 1);
assert.equal(result.samples[2].metrics.recall, 1);
assert.equal(result.samples[2].metrics.f1, 1);

// Chart data = computed F1 values, one point per required size.
assert.deepEqual(
  result.chart,
  result.samples.map((s) => ({ x: s.size, y: s.metrics.f1 })),
);
assert.equal(result.chart.length, 5);

// Determinism.
const result2 = runExperiment(documents, { width: 8, thresholdPercent: 10 });
assert.deepEqual(result.chart, result2.chart);

// Threshold sensitivity: 100% → nothing retrieved; 0% → everything retrieved.
const strict = runExperiment(documents, { width: 8, thresholdPercent: 100 });
assert.ok(strict.samples.every((s) => s.metrics.recall === 0 && s.metrics.f1 === 0));
const lenient = runExperiment(documents, { width: 8, thresholdPercent: 0 });
assert.ok(lenient.samples.every((s) => s.metrics.recall === 1));
// Size 10 has 4 relevant of 10 candidates.
assert.equal(lenient.samples[4].metrics.precision, 4 / 10);

// --- Duplicate filenames with different content: cached by ID, not name ---
const dup: EvaluationDocument[] = [
  { id: "q", name: "same.txt", text: queryText, relevant: true },
  { id: "c1", name: "same.txt", text: textOf("r1", relevantWords, 1200), relevant: true },
  { id: "c2", name: "same.txt", text: irrelevant(1), relevant: false },
  ...Array.from({ length: 8 }, (_, i) => ({
    id: `c${i + 3}`,
    name: `doc${i}.txt`,
    text: irrelevant(i + 2),
    relevant: false,
  })),
];
const dupResult = runExperiment(dup, { width: 8, thresholdPercent: 10 });
assert.equal(dupResult.samples[0].documents.length, 2);
assert.equal(dupResult.samples[0].documents[0].similarityPercent > 0, true);
assert.equal(dupResult.samples[0].documents[1].similarityPercent, 0);
// Candidate sharing the query filename is still evaluated by ID.
assert.ok(dupResult.samples[0].documents.some((d) => d.id === "c1"));

// --- Too few candidates is an error, not a partial result ---
assert.throws(
  () => runExperiment(documents.slice(0, 10), { width: 8, thresholdPercent: 10 }),
  /запрос и не менее 10 кандидатов/i,
);

// --- Conclusions: observations only, no unsupported causality claims ---
const conclusions = buildConclusions(result.samples);
assert.ok(conclusions.length >= 3);
assert.ok(conclusions.every((line) => typeof line === "string" && line.length > 10));
// Only the old causal clichés are forbidden; a meta-statement that says
// causality is NOT claimed is fine.
assert.ok(
  conclusions.every(
    (line) => !/информативнее|добавил системе шум|рост выборки улучшает/i.test(line),
  ),
);

console.log("lab 4 search quality tests passed ✓");
