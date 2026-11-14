/**
 * Pure state-transition logic for Lab 2 (no Svelte imports, Bun-testable).
 * A rejected replacement must never discard the last valid source/result.
 */

import { countWords, stemText, type StemmingResult } from "./stemming";

/** A text selected for processing (from a file or typed in). */
export interface Lab2Source {
  name: string;
  text: string;
}

/** The assignment's minimum word count for the imported text. */
export const MIN_WORDS = 100;

/** Validates a source against the assignment contract. */
export function validateLab2Source(source: Lab2Source): string[] {
  const problems: string[] = [];
  const words = countWords(source.text);
  if (words === 0) {
    problems.push("Текст не содержит ни одного слова");
  } else if (words < MIN_WORDS) {
    problems.push(`Текст содержит ${words} слов — требуется не менее ${MIN_WORDS}`);
  }
  return problems;
}

/** State of the Lab 2 view relevant to replacement decisions. */
export interface Lab2State {
  source: Lab2Source | null;
  result: StemmingResult | null;
}

/**
 * Validates FIRST. On rejection returns the previous state unchanged plus
 * Russian errors; on success returns the new source and computed result.
 */
export function applySourceState(
  source: Lab2Source,
  previous: Lab2State,
):
  | { ok: true; next: { source: Lab2Source; result: StemmingResult; errors: string[] } }
  | { ok: false; errors: string[]; previous: Lab2State } {
  const problems = validateLab2Source(source);
  if (problems.length > 0) {
    return { ok: false, errors: problems, previous };
  }
  return {
    ok: true,
    next: { source, result: stemText(source.text), errors: [] },
  };
}
