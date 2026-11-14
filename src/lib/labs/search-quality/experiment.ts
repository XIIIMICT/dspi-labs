/**
 * Lab 4 experiment: evaluates the Lab 3 shingle-similarity retrieval at the
 * required sample sizes {2, 4, 6, 8, 10} and produces the F1 chart data.
 *
 * Protocol (an application interpretation, NOT a literal rule from the
 * manual): the manual says «согласно реализации своего алгоритма в лабораторной
 * работе №3» and asks for metrics on 2/4/6/8/10 documents, but does not define
 * a query, a threshold, or how relevance labels are obtained. This app uses:
 *   - a designated query text (documents[0]) that is NOT a returned document;
 *   - a candidate collection with an explicit, user-supplied relevance label
 *     («эталонная разметка релевантности» — a human judgment, not objective
 *     truth; the manual distinguishes objective relevance from subjective
 *     pertinence);
 *   - retrieval = shingle-similarity with the query ≥ threshold (Lab 3
 *     pipeline: SHA-1, 8-word shingles, 84 control sums);
 *   - sample size N = exactly N candidate documents, so a+b+c+d = N.
 *
 * Confusion counts per the manual's table: a = retrieved relevant,
 * b = retrieved non-relevant, c = missed relevant, d = missed NON-relevant.
 * The manual's prose line for d repeats c ("не выданных релевантных"), but the
 * confusion table places d in the not-retrieved × non-relevant cell and the
 * Fallout formula uses b+d as the total non-relevant documents. The code
 * follows the table + formula (the consistent interpretation).
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

/** A collection document with a stable unique ID and an explicit label. */
export interface EvaluationDocument {
  /** Stable identity — filenames are display metadata and may repeat. */
  id: string;
  name: string;
  text: string;
  /** Explicit ground-truth label supplied by the user (not objective truth). */
  relevant: boolean;
}

/** Per-document outcome at one sample size. */
export interface DocumentOutcome {
  id: string;
  name: string;
  relevant: boolean;
  similarityPercent: number;
  retrieved: boolean;
}

/** One evaluation run at a given sample size. */
export interface SampleResult {
  /** Number of candidate documents evaluated; a+b+c+d equals this. */
  size: number;
  /** Deterministic candidate subset used for this run, in order. */
  documents: DocumentOutcome[];
  counts: ConfusionCounts;
  metrics: QualityMetrics;
}

/** The full experiment output. */
export interface ExperimentResult {
  /** Query text name (the designated first document, never a result). */
  queryName: string;
  /** Similarity threshold in percent used as the retrieval rule. */
  thresholdPercent: number;
  /** Results for sizes 2, 4, 6, 8, 10 in order. */
  samples: SampleResult[];
  /** Chart series: [candidate count, F1] per sample, computed values. */
  chart: Array<{ x: number; y: number }>;
}

/**
 * Runs the experiment. `documents[0]` is the query; the remaining documents
 * are candidates in the given (fixed) order. For each size N exactly the
 * first N candidates are evaluated; the query is a separate input. Requires
 * one query plus at least 10 candidates; fewer throws instead of returning
 * partial results. Sketches are cached by stable document ID, never by name.
 */
export function runExperiment(
  documents: EvaluationDocument[],
  config: { width: number; thresholdPercent: number },
): ExperimentResult {
  const maxSize = SAMPLE_SIZES[SAMPLE_SIZES.length - 1];
  if (documents.length < maxSize + 1) {
    throw new Error(
      `Требуется запрос и не менее ${maxSize} кандидатов — передано ${documents.length} документов`,
    );
  }
  const [query, ...candidates] = documents;
  const sketches = new Map<string, ShingleSketch>();
  const querySketch: ShingleSketch = buildSketch(query.text, { width: config.width });
  sketches.set(query.id, querySketch);

  const samples: SampleResult[] = [];
  for (const size of SAMPLE_SIZES) {
    const subset = candidates.slice(0, size);

    const outcomes: DocumentOutcome[] = [];
    const relevanceFlags: boolean[] = [];
    const retrievedFlags: boolean[] = [];

    for (const doc of subset) {
      let sketch = sketches.get(doc.id);
      if (!sketch) {
        sketch = buildSketch(doc.text, { width: config.width });
        sketches.set(doc.id, sketch);
      }
      const comparison = compareSketches(querySketch, sketch);
      const retrieved = comparison.similarityPercent >= config.thresholdPercent;
      outcomes.push({
        id: doc.id,
        name: doc.name,
        relevant: doc.relevant,
        similarityPercent: comparison.similarityPercent,
        retrieved,
      });
      relevanceFlags.push(doc.relevant);
      retrievedFlags.push(retrieved);
    }

    const counts = buildConfusion(relevanceFlags, retrievedFlags);
    // Invariant: the reported size equals the evaluated population.
    if (
      counts.retrievedRelevant +
        counts.retrievedNonRelevant +
        counts.missedRelevant +
        counts.missedNonRelevant !==
      size
    ) {
      throw new Error("Нарушен инвариант: a+b+c+d должно равняться размеру выборки");
    }
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
 * Generates report conclusions strictly from the measured data. These are
 * observations about this particular collection, not claims that growing the
 * sample inherently improves informativeness or that a cause was established.
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
    `На использованной коллекции максимальная F1-мера (${(best.f1 * 100).toFixed(1)}%) зафиксирована на выборке из ${best.size} документов, минимальная (${(worst.f1 * 100).toFixed(1)}%) — на выборке из ${worst.size}.`,
  );

  let monotone = true;
  for (let i = 1; i < points.length; i++) {
    if (points[i].f1 < points[i - 1].f1) monotone = false;
  }
  lines.push(
    monotone
      ? "На этих данных F1-мера не убывала при увеличении выборки; это наблюдение по конкретной коллекции, а не общая закономерность."
      : "На этих данных F1-мера изменялась немонотонно: рост выборки сопровождался как повышением, так и снижением значения на разных участках.",
  );

  const first = points[0];
  const last = points[points.length - 1];
  const delta = last.f1 - first.f1;
  lines.push(
    `От выборки из ${first.size} к выборке из ${last.size} документов F1-мера ${delta > 0 ? "выросла" : delta < 0 ? "снизилась" : "не изменилась"} с ${(first.f1 * 100).toFixed(1)}% до ${(last.f1 * 100).toFixed(1)}% (изменение ${(delta * 100).toFixed(1)} п.п.).`,
  );

  const avgFallout = points.reduce((sum, p) => sum + p.f, 0) / points.length;
  lines.push(
    `Средний коэффициент выпадения по всем выборкам — ${(avgFallout * 100).toFixed(1)}%: наблюдаемая доля нерелевантных документов, выданных системой, среди всех нерелевантных в базе.`,
  );
  lines.push(
    "Выводы описывают только измеренные значения на загруженной коллекции; методичка не задаёт вид зависимости, поэтому причинно-следственные утверждения здесь не делаются.",
  );

  return lines;
}
