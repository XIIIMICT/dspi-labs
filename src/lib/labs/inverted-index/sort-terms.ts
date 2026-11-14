/**
 * Russian-locale alphabetical ordering for the Lab 1 dictionary
 * (Методичка, ЛР 1: «Полученный на данном этапе список сортируется в
 * алфавитном порядке»). Extracted as a pure helper so the index view and
 * tests share the exact same comparator instead of each re-sorting locally.
 *
 * `Intl.Collator("ru")` is used with numeric comparison off; «ё» collates
 * as a distinct letter adjacent to «е» (its exact position is asserted in
 * `tests/labs/lab1-validation.test.mts`).
 */

const collator = new Intl.Collator("ru");

/** Compares two terms alphabetically in Russian locale order. */
export function compareTerms(a: string, b: string): number {
  return collator.compare(a, b);
}

/** Returns a new alphabetically sorted array of term strings. */
export function sortTermsAlphabetically(terms: string[]): string[] {
  return [...terms].sort(compareTerms);
}
