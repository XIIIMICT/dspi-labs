/**
 * Dictionary-based stemming (ЛР 2, варианты 2/8/14 — «Стемминг словарный»).
 *
 * Manual (Методичка, ЛР 2, «Методические указания»): a dictionary stemmer
 * matches word bases against a dictionary and «анализ начинается с начала
 * слова». The manual does NOT define the exact key format, tie-breaking, or
 * fallback algorithm: the exact-then-longest-prefix lookup below is this
 * application's deterministic interpretation of that phrase, not a verbatim
 * rule from the manual. The dictionary is hand-built and offline; unknown
 * words are left unchanged (no claim of full linguistic coverage).
 *
 * This is deliberately NOT the naive suffix stripper used by Lab 1's index.
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
 * the longest dictionary key that is a proper prefix of the word. The fallback
 * is the implementation interpretation of the manual's «analysis starts from
 * the beginning of the word»; the manual does not prescribe this exact rule.
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

/**
 * Aggregates per-part match types into one compound status, without inventing
 * matches: all misses → "none"; any unmatched part or any prefix fallback →
 * "prefix" (an inexact/partial match); all parts exact → "exact".
 */
export function aggregateMatch(parts: StemLookup[]): StemLookup["match"] {
  if (parts.every((p) => p.match === "none")) return "none";
  if (parts.some((p) => p.match === "none" || p.match === "prefix")) return "prefix";
  return "exact";
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
      const anyFound = parts.some((p) => p.stem !== null);
      const joined = parts.map((p) => p.stem ?? p.source).join("-");
      words.push({
        start: span.start,
        end: span.end,
        source: span.word,
        stem: anyFound ? joined : null,
        match: aggregateMatch(parts),
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
 * Applies the source word's casing to a lowercase stem: ALL CAPS → upper,
 * Initial capital → capitalized, lowercase → unchanged. Mixed/unusual casing
 * (e.g. camelCase) falls back to lowercase.
 */
export function matchCasing(source: string, stem: string): string {
  if (source === source.toLowerCase()) return stem;
  if (source === source.toUpperCase()) return stem.toUpperCase();
  if (
    source.length > 1 &&
    source[0] === source[0].toUpperCase() &&
    source.slice(1) === source.slice(1).toLowerCase()
  ) {
    return stem.charAt(0).toUpperCase() + stem.slice(1);
  }
  return stem;
}

/**
 * Rebuilds the text with every matched word replaced by its stem, preserving
 * all original punctuation, whitespace, and the casing of matched words.
 */
export function renderStemmedText(text: string, result: StemmingResult): string {
  let out = "";
  let cursor = 0;
  for (const w of result.words) {
    out += text.slice(cursor, w.start);
    if (w.stem === null) {
      out += w.source;
    } else if (w.source.includes("-")) {
      // Preserve each part's casing independently.
      const sources = w.source.split("-");
      out += w.stem
        .split("-")
        .map((part, i) => matchCasing(sources[i] ?? part, part))
        .join("-");
    } else {
      out += matchCasing(w.source, w.stem);
    }
    cursor = w.end;
  }
  out += text.slice(cursor);
  return out;
}
