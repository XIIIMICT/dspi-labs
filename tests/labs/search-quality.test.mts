/**
 * Lab 4 (search quality) tests: hand-computed confusion examples for each
 * metric, zero-denominator rules, exact sample sizes {2,4,6,8,10}, stable
 * subset selection, chart data derived from computed values, and the
 * experiment protocol (metrics from labels + retrieval decisions only).
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
// a=3, b=1, c=2, d=4  →  P = 3/4, R = 3/5, F = 1/9, F1 = 2PR/(P+R)
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

// --- Zero-denominator rules ---
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

// --- Confusion built from labels + decisions ---
assert.deepEqual(buildConfusion([true, true, false, false], [true, false, true, false]), {
  retrievedRelevant: 1,
  retrievedNonRelevant: 1,
  missedRelevant: 1,
  missedNonRelevant: 1,
});

// --- Experiment protocol ---
// Query + 9 candidates: 4 relevant (sharing vocabulary with the query),
// 5 non-relevant (distinct vocabulary). Deterministic and inspectable.
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

const documents: EvaluationDocument[] = [
  { name: "query.txt", text: queryText, relevant: true },
  { name: "rel1.txt", text: textOf("r1", relevantWords, 1200), relevant: true },
  { name: "rel2.txt", text: textOf("r2", relevantWords, 1200), relevant: true },
  { name: "rel3.txt", text: textOf("r3", relevantWords, 1200), relevant: true },
  { name: "rel4.txt", text: textOf("r4", relevantWords, 1200), relevant: true },
  { name: "irr1.txt", text: irrelevant(1), relevant: false },
  { name: "irr2.txt", text: irrelevant(2), relevant: false },
  { name: "irr3.txt", text: irrelevant(3), relevant: false },
  { name: "irr4.txt", text: irrelevant(4), relevant: false },
  { name: "irr5.txt", text: irrelevant(5), relevant: false },
];

const result = runExperiment(documents, { width: 8, thresholdPercent: 10 });

// Exact sample sizes, in order.
assert.deepEqual(
  result.samples.map((s) => s.size),
  [...SAMPLE_SIZES],
);
assert.deepEqual([...SAMPLE_SIZES], [2, 4, 6, 8, 10]);

// Stable subsets: size N = query + first N−1 candidates.
assert.equal(result.samples[0].documents.length, 1); // size 2 → 1 evaluated
assert.equal(result.samples[4].documents.length, 9); // size 10 → 9 evaluated
assert.deepEqual(
  result.samples[4].documents.map((d) => d.name),
  [
    "rel1.txt",
    "rel2.txt",
    "rel3.txt",
    "rel4.txt",
    "irr1.txt",
    "irr2.txt",
    "irr3.txt",
    "irr4.txt",
    "irr5.txt",
  ],
);

// Relevant docs share 600 of 1200 words with the query → high similarity;
// irrelevant share none → similarity 0.
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
// At size 6 (query + 4 relevant + 1 irrelevant), threshold 10%: all 4 relevant
// retrieved, the irrelevant one not → a=4, b=0, c=0, d=1.
assert.deepEqual(result.samples[2].counts, {
  retrievedRelevant: 4,
  retrievedNonRelevant: 0,
  missedRelevant: 0,
  missedNonRelevant: 1,
});
assert.equal(result.samples[2].metrics.precision, 1);
assert.equal(result.samples[2].metrics.recall, 1);
assert.equal(result.samples[2].metrics.f1, 1);
assert.equal(result.samples[2].metrics.fallout, 0);

// Size 2 (query + rel1): a=1, everything else 0 → P=R=F1=1, Fallout 0 (b+d=0).
assert.deepEqual(result.samples[0].counts, {
  retrievedRelevant: 1,
  retrievedNonRelevant: 0,
  missedRelevant: 0,
  missedNonRelevant: 0,
});

// Chart data = computed F1 values, one point per required size.
assert.deepEqual(
  result.chart,
  result.samples.map((s) => ({ x: s.size, y: s.metrics.f1 })),
);
assert.equal(result.chart.length, 5);

// Determinism: same inputs → same chart.
const result2 = runExperiment(documents, { width: 8, thresholdPercent: 10 });
assert.deepEqual(result.chart, result2.chart);

// Threshold sensitivity: with a 100% threshold nothing is retrieved → all
// metrics 0 except fallout denominators; with 0% everything is retrieved.
const strict = runExperiment(documents, { width: 8, thresholdPercent: 100 });
assert.ok(strict.samples.every((s) => s.metrics.recall === 0 && s.metrics.f1 === 0));
const lenient = runExperiment(documents, { width: 8, thresholdPercent: 0 });
// Everything retrieved: precision = share of relevant among candidates.
assert.ok(lenient.samples.every((s) => s.metrics.recall === 1));
assert.equal(lenient.samples[4].metrics.precision, 4 / 9);

// --- Conclusions generated from measured data ---
const conclusions = buildConclusions(result.samples);
assert.ok(conclusions.length >= 3);
assert.ok(conclusions.every((line) => typeof line === "string" && line.length > 10));

console.log("lab 4 search quality tests passed ✓");
