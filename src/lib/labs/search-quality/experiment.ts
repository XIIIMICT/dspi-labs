/**
 * Lab 4 experiment: evaluates the Lab 3 shingle-similarity retrieval at the
 * required sample sizes {2, 4, 6, 8, 10} and produces the F1 chart data.
 *
 * Retrieval scenario (resolved per the manual's «согласно реализации своего
 * алгоритма в лабораторной работе №3»): the query is a designated text; the
 * search system compares the query's shingle sketch with every candidate
 * document using the Lab 3 pipeline (SHA-1, 8-word shingles, 84 control
 * sums). A document is retrieved when its similarity with the query is at
 * least the threshold. Ground truth is explicit and deterministic: documents
 * marked relevant vs non-relevant. Metrics come from confusion counts.
 */

import { buildSketch, compareSketches, type ShingleSketch } from "../shingles/shingles";
import {
  buildConfusion,
  computeMetrics,
  type ConfusionCounts,
  type QualityMetrics,
} from "./metrics";

/** The assignment's exact sample sizes. */
export const SAMPLE_SIZES = [2, 4, 6, 8, 10] as const;

/** A collection document with its deterministic ground-truth label. */
export interface EvaluationDocument {
  name: string;
  text: string;
  /** Ground truth: whether this document is relevant to the query. */
  relevant: boolean;
}

/** Per-document outcome at one sample size. */
export interface DocumentOutcome {
  name: string;
  relevant: boolean;
  similarityPercent: number;
  retrieved: boolean;
}

/** One evaluation run at a given sample size. */
export interface SampleResult {
  size: number;
  /** Deterministic document subset used for this run, in order. */
  documents: DocumentOutcome[];
  counts: ConfusionCounts;
  metrics: QualityMetrics;
}

/** The full experiment output. */
export interface ExperimentResult {
  /** Query text name (the designated first document). */
  queryName: string;
  /** Similarity threshold in percent used as the retrieval rule. */
  thresholdPercent: number;
  /** Results for sizes 2, 4, 6, 8, 10 in order. */
  samples: SampleResult[];
  /** Chart series: [document count, F1] per sample, computed values. */
  chart: Array<{ x: number; y: number }>;
}

/**
 * Runs the experiment. `documents[0]` is the query; the remaining documents
 * are candidates in the given (fixed) order. For each size N the subset is
 * the query plus the first N−1 candidates — stable selection, so runs are
 * reproducible.
 */
export function runExperiment(
  documents: EvaluationDocument[],
  config: { width: number; thresholdPercent: number },
): ExperimentResult {
  const [query, ...candidates] = documents;
  const querySketch: ShingleSketch = buildSketch(query.text, { width: config.width });
  const sketches = new Map<string, ShingleSketch>([[query.name, querySketch]]);

  const samples: SampleResult[] = [];
  for (const size of SAMPLE_SIZES) {
    // The subset for size N: query + first N−1 candidates (deterministic).
    const subset = [query, ...candidates.slice(0, size - 1)];

    const outcomes: DocumentOutcome[] = [];
    const relevanceFlags: boolean[] = [];
    const retrievedFlags: boolean[] = [];

    for (const doc of subset) {
      if (doc.name === query.name) continue; // the query itself is not a result
      let sketch = sketches.get(doc.name);
      if (!sketch) {
        sketch = buildSketch(doc.text, { width: config.width });
        sketches.set(doc.name, sketch);
      }
      const comparison = compareSketches(querySketch, sketch);
      const retrieved = comparison.similarityPercent >= config.thresholdPercent;
      outcomes.push({
        name: doc.name,
        relevant: doc.relevant,
        similarityPercent: comparison.similarityPercent,
        retrieved,
      });
      relevanceFlags.push(doc.relevant);
      retrievedFlags.push(retrieved);
    }

    const counts = buildConfusion(relevanceFlags, retrievedFlags);
    samples.push({ size, documents: outcomes, counts, metrics: computeMetrics(counts) });
  }

  return {
    queryName: query.name,
    thresholdPercent: config.thresholdPercent,
    samples,
    chart: samples.map((s) => ({ x: s.size, y: s.metrics.f1 })),
  };
}

/**
 * Generates report conclusions from the measured data (no monotonicity
 * assumptions). Returns Russian sentences for the UI.
 */
export function buildConclusions(samples: SampleResult[]): string[] {
  const lines: string[] = [];
  const points = samples.map((s) => ({
    size: s.size,
    f1: s.metrics.f1,
    p: s.metrics.precision,
    r: s.metrics.recall,
    f: s.metrics.fallout,
  }));

  const best = points.reduce((acc, p) => (p.f1 > acc.f1 ? p : acc), points[0]);
  const worst = points.reduce((acc, p) => (p.f1 < acc.f1 ? p : acc), points[0]);
  lines.push(
    `Максимальная F1-мера (${(best.f1 * 100).toFixed(1)}%) достигается на выборке из ${best.size} документов; минимальная (${(worst.f1 * 100).toFixed(1)}%) — на выборке из ${worst.size}.`,
  );

  let monotone = true;
  for (let i = 1; i < points.length; i++) {
    if (points[i].f1 < points[i - 1].f1) monotone = false;
  }
  lines.push(
    monotone
      ? "С ростом объёма выборки F1-мера не убывает: на использованных данных увеличение коллекции не снижает совместную оценку точности и полноты."
      : "Зависимость F1-меры от объёма выборки немонотонна: добавление документов может как улучшить, так и ухудшить совместную оценку точности и полноты на конкретных данных.",
  );

  const first = points[0];
  const last = points[points.length - 1];
  const delta = last.f1 - first.f1;
  lines.push(
    delta > 0
      ? `При переходе от ${first.size} к ${last.size} документам F1-мера выросла с ${(first.f1 * 100).toFixed(1)}% до ${(last.f1 * 100).toFixed(1)}% (${(delta * 100).toFixed(1)} п.п.) — большая выборка делает оценку информативнее.`
      : delta < 0
        ? `При переходе от ${first.size} к ${last.size} документам F1-мера снизилась с ${(first.f1 * 100).toFixed(1)}% до ${(last.f1 * 100).toFixed(1)}% (${(Math.abs(delta) * 100).toFixed(1)} п.п.) — рост выборки добавил системе шумовых документов.`
        : `F1-мера одинакова (${(first.f1 * 100).toFixed(1)}%) на выборках из ${first.size} и ${last.size} документов — объём выборки не изменил совместную оценку.`,
  );

  const avgFallout = points.reduce((sum, p) => sum + p.f, 0) / points.length;
  lines.push(
    `Средний коэффициент выпадения по всем выборкам — ${(avgFallout * 100).toFixed(1)}%: это доля нерелевантных документов, выданных системой, среди всех нерелевантных в базе.`,
  );

  return lines;
}
