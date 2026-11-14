/**
 * Search-quality metrics (ЛР 4) — pure functions, manual formulas.
 *
 * Manual (Методичка, ЛР 4): confusion counts
 *   a = retrieved relevant documents,
 *   b = retrieved non-relevant documents,
 *   c = relevant documents not retrieved,
 *   d = non-relevant documents not retrieved;
 *   R (полнота)      = a / (a + c)
 *   P (точность)     = a / (a + b)
 *   Fallout (выпадение) = b / (b + d)
 *   F1               = 2PR / (P + R)
 *
 * Zero denominators: the fraction is defined as 0 (an empty denominator
 * contributes nothing). F1 is 0 when P + R = 0.
 */

/** Confusion counts for one evaluation run. */
export interface ConfusionCounts {
  retrievedRelevant: number;
  retrievedNonRelevant: number;
  missedRelevant: number;
  missedNonRelevant: number;
}

/** Computed coefficients for one evaluation run. */
export interface QualityMetrics {
  precision: number;
  recall: number;
  fallout: number;
  f1: number;
}

/** a / (a + b) with the zero-denominator rule (0 when a + b = 0). */
export function fraction(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return numerator / denominator;
}

/** Computes P, R, Fallout, F1 from confusion counts. */
export function computeMetrics(counts: ConfusionCounts): QualityMetrics {
  const {
    retrievedRelevant: a,
    retrievedNonRelevant: b,
    missedRelevant: c,
    missedNonRelevant: d,
  } = counts;
  const recall = fraction(a, a + c);
  const precision = fraction(a, a + b);
  const fallout = fraction(b, b + d);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return { precision, recall, fallout, f1 };
}

/**
 * Builds confusion counts from per-document ground truth and retrieval
 * decisions — metrics are always derived from these lists, never hard-coded.
 */
export function buildConfusion(relevance: boolean[], retrieved: boolean[]): ConfusionCounts {
  const counts: ConfusionCounts = {
    retrievedRelevant: 0,
    retrievedNonRelevant: 0,
    missedRelevant: 0,
    missedNonRelevant: 0,
  };
  for (let i = 0; i < relevance.length; i++) {
    if (relevance[i] && retrieved[i]) counts.retrievedRelevant += 1;
    else if (!relevance[i] && retrieved[i]) counts.retrievedNonRelevant += 1;
    else if (relevance[i] && !retrieved[i]) counts.missedRelevant += 1;
    else counts.missedNonRelevant += 1;
  }
  return counts;
}
