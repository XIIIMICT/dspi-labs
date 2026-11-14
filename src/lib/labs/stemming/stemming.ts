/**
 * Dictionary-based stemming (ЛР 2, варианты 2/8/14 — «Стемминг словарный»).
 *
 * Manual (Методичка, ЛР 2, «Методические указания»): a dictionary stemmer
 * «выполняет сопоставление основ слов во входном тексте и в соответствующем
 * словаре, а анализ начинается с начала слова» — the word is matched against
 * a base-form dictionary, and the analysis starts from the beginning of the
 * word (longest-prefix rule). This is deliberately NOT the naive suffix
 * stripper used by Lab 1's inverted index.
 *
 * Pure module: no Svelte imports, runs under Bun tests directly.
 */

import { stemDictionary } from "./dictionary";

/** Result of looking up a single word. */
export interface StemLookup {
  /** Source word as written in the text (original casing preserved). */
  source: string;
  /** Lowercased word used for the dictionary lookup. */
  lookup: string;
  /** Base form (основа) from the dictionary, or null when absent. */
  stem: string | null;
  /** How the stem was found: exact entry or longest-prefix fallback. */
  match: "exact" | "prefix" | "none";
}

/** Minimum length for a prefix fallback to count as a dictionary match. */
const MIN_PREFIX_MATCH = 3;

const entries = new Map(Object.entries(stemDictionary.entries));

/**
 * Looks a single lowercase word up in the dictionary: exact entry first, then
 * the longest dictionary key that is a proper prefix of the word (the manual's
 * "analysis starts from the beginning of the word" rule).
 */
export function lookupStem(word: string): StemLookup {
  const lookup = word.toLowerCase();
  const exact = entries.get(lookup);
  if (exact !== undefined) {
    return { source: word, lookup, stem: exact, match: "exact" };
  }

  let bestKey: string | null = null;
  for (const key of entries.keys()) {
    if (key.length >= MIN_PREFIX_MATCH && lookup.length > key.length && lookup.startsWith(key)) {
      if (bestKey === null || key.length > bestKey.length) {
        bestKey = key;
      }
    }
  }
  if (bestKey !== null) {
    return { source: word, lookup, stem: entries.get(bestKey)!, match: "prefix" };
  }
  return { source: word, lookup, stem: null, match: "none" };
}

/** A word occurrence with its source coordinates (for structure-preserving output). */
export interface TokenSpan {
  start: number;
  end: number;
  word: string;
}

/** Splits text into letter/hyphen tokens with their source offsets. */
export function findTokenSpans(text: string): TokenSpan[] {
  const spans: TokenSpan[] = [];
  for (const match of text.matchAll(/\p{L}+(?:-\p{L}+)*/gu)) {
    spans.push({
      start: match.index ?? 0,
      end: (match.index ?? 0) + match[0].length,
      word: match[0],
    });
  }
  return spans;
}

/** Counts words in a text by the same rule the tokenizer uses. */
export function countWords(text: string): number {
  return findTokenSpans(text).length;
}

/**
 * Stems a hyphenated compound by looking up each letter part independently
 * (`кто-то`, `по-русски`); parts shorter than 2 letters pass through as-is.
 */
export function lookupHyphenated(word: string): StemLookup[] {
  const parts = word.split("-");
  if (parts.length < 2) return [lookupStem(word)];
  return parts.map((part) =>
    part.length >= 2
      ? lookupStem(part)
      : {
          source: part,
          lookup: part.toLowerCase(),
          stem: part.toLowerCase(),
          match: "exact" as const,
        },
  );
}

/** One processed word of the text: occurrence plus dictionary result. */
export interface StemmedWord {
  start: number;
  end: number;
  source: string;
  stem: string | null;
  match: "exact" | "prefix" | "none";
}

/** Result of processing the whole text. */
export interface StemmingResult {
  /** Every word occurrence in source order, with its stem or null. */
  words: StemmedWord[];
  /** Total word occurrences. */
  totalWords: number;
  /** Occurrences found in the dictionary (exact or prefix). */
  matched: number;
  /** Occurrences absent from the dictionary. */
  missed: number;
  /** Unique stems produced, first-seen order. */
  uniqueStems: string[];
}

/**
 * Processes the whole text: finds word tokens (punctuation and whitespace are
 * separators, not tokens), looks each up in the dictionary. The source text is
 * never mutated; offsets let the view rebuild the text with stems substituted.
 */
export function stemText(text: string): StemmingResult {
  const words: StemmedWord[] = [];
  for (const span of findTokenSpans(text)) {
    if (span.word.includes("-")) {
      // Hyphenated compounds keep a single span but per-part lookups; the
      // display stem joins the parts with the original hyphen.
      const parts = lookupHyphenated(span.word);
      const allFound = parts.every((p) => p.stem !== null);
      const joined = parts.map((p) => p.stem ?? p.source).join("-");
      words.push({
        start: span.start,
        end: span.end,
        source: span.word,
        stem: allFound || parts.some((p) => p.stem !== null) ? joined : null,
        match: allFound ? "exact" : "prefix",
      });
    } else {
      const found = lookupStem(span.word);
      words.push({
        start: span.start,
        end: span.end,
        source: span.word,
        stem: found.stem,
        match: found.match,
      });
    }
  }

  const matched = words.filter((w) => w.stem !== null).length;
  const uniqueStems: string[] = [];
  for (const w of words) {
    if (w.stem !== null && !uniqueStems.includes(w.stem)) uniqueStems.push(w.stem);
  }
  return { words, totalWords: words.length, matched, missed: words.length - matched, uniqueStems };
}

/**
 * Rebuilds the text with every matched word replaced by its stem, preserving
 * all original punctuation, whitespace, and casing of unmatched words.
 */
export function renderStemmedText(text: string, result: StemmingResult): string {
  let out = "";
  let cursor = 0;
  for (const w of result.words) {
    out += text.slice(cursor, w.start);
    out += w.stem ?? w.source;
    cursor = w.end;
  }
  out += text.slice(cursor);
  return out;
}
