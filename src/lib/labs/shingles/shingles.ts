/**
 * Shingle-based text comparison (ЛР 3, варианты 2/8/14: SHA-1, 8-word shingles,
 * English texts).
 *
 * Manual (Методичка, ЛР 3, «Методические указания») pipeline, in order:
 *   1) канонизация — lowercase, strip punctuation/tags/digits, remove
 *      auxiliary words (prepositions/conjunctions — stop words), and bring a
 *      LIMITED set of unambiguous known plural nouns to a singular base form.
 *      The manual describes this stage in Russian morphological terms; for
 *      English this is a documented conservative offline approximation: a
 *      `Map` of unambiguous irregular plurals plus guarded regular candidates
 *      confirmed against a local singular list. Ambiguous forms (`bases`,
 *      `data`) are left unchanged because there is no POS/context analysis.
 *      It is NOT full noun lemmatization, and root reduction («иногда»)
 *      remains an optional, deliberately unused step.
 *   2) разбиение на шинглы — overlapping sequences of W consecutive canonical
 *      tokens («внахлест»), count = tokens − W + 1;
 *   3) вычисление хэшей — for each of the 84 static hash functions compute a
 *      control sum for every shingle;
 *   4) случайная выборка — from each of the 84 rows take the minimum control
 *      sum (the manual's fixed sampling rule);
 *   5) сравнение — count how many of the 84 selected sums coincide between two
 *      texts; similarity % = matches / 84 × 100.
 *
 * The manual requires 84 static hash functions but does NOT define their
 * byte-level construction. The 84 functions here are an implementation choice:
 * SHA-1 (the registered algorithm) over `${salt}:${shingleText}` with
 * salt 0..83, folded to a 48-bit integer from the first 6 digest bytes in
 * big-endian order. Everything is computed locally; no network service.
 *
 * Pure module: no Svelte imports. SHA-1 is a small pure-TS implementation so
 * tests and workers share the exact same code path as the browser.
 */

/** Number of static hash functions per the manual. */
export const HASH_FUNCTION_COUNT = 84;

/** English stop words removed at canonicalization (auxiliary units). */
const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "if",
  "then",
  "else",
  "when",
  "while",
  "of",
  "at",
  "by",
  "for",
  "with",
  "about",
  "against",
  "between",
  "into",
  "through",
  "during",
  "before",
  "after",
  "above",
  "below",
  "to",
  "from",
  "up",
  "down",
  "in",
  "out",
  "on",
  "off",
  "over",
  "under",
  "again",
  "further",
  "once",
  "here",
  "there",
  "all",
  "any",
  "both",
  "each",
  "few",
  "more",
  "most",
  "other",
  "some",
  "such",
  "no",
  "nor",
  "not",
  "only",
  "own",
  "same",
  "so",
  "than",
  "too",
  "very",
  "can",
  "will",
  "just",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "this",
  "that",
  "these",
  "those",
  "it",
  "its",
]);

/**
 * Deterministic, offline, conservative English singularization. This is a
 * LIMITED approximation, NOT full noun lemmatization, NOT POS-aware analysis,
 * and NOT a language detector.
 *
 * Blanket `-s` stripping corrupts ordinary words (`news → new`,
 * `series → sery`, `always → alway`), so suffix rules only GENERATE a
 * candidate. A candidate is accepted only when it is present in
 * `KNOWN_SINGULARS` (a local offline list); every other token is returned
 * unchanged. Irregular forms live in a `Map` so inherited object properties
 * (`constructor`, `toString`) can never leak a function into canonical output,
 * and ambiguous mappings (`bases`, `data`) are intentionally excluded.
 * Actual coverage is exactly the entries below plus the confirmed candidates;
 * see `docs/requirements-matrix.md`.
 */

/** Irregular plural → singular (prototype-safe: no object property lookup).
 * Ambiguous forms are deliberately ABSENT: `bases` can be the plural of
 * `base` or `basis`, and `data` is commonly a mass/singular noun in technical
 * English. Without POS context the conservative choice is to leave them
 * unchanged rather than guess. Scope is documented in requirements-matrix.md.
 */
const IRREGULAR_PLURALS = new Map<string, string>([
  ["children", "child"],
  ["men", "man"],
  ["women", "woman"],
  ["people", "person"],
  ["feet", "foot"],
  ["teeth", "tooth"],
  ["geese", "goose"],
  ["mice", "mouse"],
  ["oxen", "ox"],
  ["indices", "index"],
  ["matrices", "matrix"],
  ["analyses", "analysis"],
  ["crises", "crisis"],
  ["phenomena", "phenomenon"],
  ["criteria", "criterion"],
  ["wolves", "wolf"],
  ["leaves", "leaf"],
  ["knives", "knife"],
  ["lives", "life"],
  ["wives", "wife"],
]);

/**
 * Local offline list of base noun forms. A generated singular candidate is
 * accepted only if it appears here; this is the guard that keeps `news`,
 * `series`, `species`, `physics`, `always`, `various`, and `alias` intact.
 * Coverage is a hand-curated educational set of common technical/general
 * nouns — deliberately finite, NOT a full English lexicon (no POS analysis).
 */
const KNOWN_SINGULARS = new Set<string>([
  "analysis",
  "algorithm",
  "author",
  "batch",
  "block",
  "book",
  "box",
  "business",
  "cat",
  "category",
  "child",
  "city",
  "class",
  "cluster",
  "collection",
  "company",
  "component",
  "computer",
  "country",
  "crisis",
  "criterion",
  "database",
  "dataset",
  "day",
  "document",
  "dog",
  "element",
  "engine",
  "entry",
  "error",
  "event",
  "file",
  "form",
  "fox",
  "function",
  "glass",
  "group",
  "hash",
  "hero",
  "index",
  "knife",
  "leaf",
  "life",
  "line",
  "list",
  "man",
  "matrix",
  "match",
  "method",
  "model",
  "mouse",
  "network",
  "node",
  "number",
  "object",
  "operation",
  "ox",
  "page",
  "pair",
  "part",
  "party",
  "person",
  "phrase",
  "point",
  "position",
  "potato",
  "process",
  "program",
  "quality",
  "query",
  "record",
  "request",
  "result",
  "row",
  "rule",
  "sample",
  "section",
  "sentence",
  "server",
  "set",
  "shingle",
  "source",
  "story",
  "string",
  "structure",
  "system",
  "table",
  "term",
  "text",
  "token",
  "tomato",
  "tool",
  "topic",
  "tree",
  "user",
  "value",
  "vector",
  "wife",
  "wolf",
  "word",
  "worker",
]);

/**
 * Generates plausible singular candidates from a token ending in `s`.
 * These are only candidates — `singularize()` confirms them against
 * `KNOWN_SINGULARS` before accepting one.
 */
function singularCandidates(token: string): string[] {
  const candidates: string[] = [];
  if (token.length > 4 && token.endsWith("ies")) {
    candidates.push(`${token.slice(0, -3)}y`); // companies → company
  }
  if (token.length > 4 && /(?:ss|sh|ch|x|z)es$/.test(token)) {
    candidates.push(token.slice(0, -2)); // classes → class, boxes → box
  }
  if (token.length > 4 && token.endsWith("oes")) {
    candidates.push(token.slice(0, -2)); // heroes → hero
  }
  if (
    token.length > 3 &&
    token.endsWith("s") &&
    !token.endsWith("ss") &&
    !token.endsWith("us") &&
    !token.endsWith("is")
  ) {
    candidates.push(token.slice(0, -1)); // cats → cat
  }
  return candidates;
}

/** Returns the singular for a known plural, otherwise the token unchanged. */
export function singularize(token: string): string {
  const irregular = IRREGULAR_PLURALS.get(token);
  if (irregular !== undefined) return irregular;
  if (!token.endsWith("s")) return token;
  for (const candidate of singularCandidates(token)) {
    if (KNOWN_SINGULARS.has(candidate)) return candidate;
  }
  return token;
}

/**
 * Canonical tokens: lowercase English letter sequences, stop words removed,
 * common plural nouns brought to a singular base form. HTML-like tags and
 * digits act as separators; the original source text is never mutated.
 *
 * Deliberately NOT implemented (both optional in the manual): adjective
 * removal («часто предполагается») and root reduction («иногда»). Without
 * POS analysis, dropping adjectives would change shingle content and risk
 * over-normalization; this stage keeps every non-stop-word token.
 * See `docs/requirements-matrix.md`.
 */
export function canonicalize(text: string): string[] {
  const tokens: string[] = [];
  // Tags are stripped before letter extraction so tag names are not tokens.
  const withoutTags = text.replace(/<[^>]*>/g, " ");
  for (const match of withoutTags.toLowerCase().matchAll(/[a-z]+/g)) {
    if (STOP_WORDS.has(match[0])) continue;
    tokens.push(singularize(match[0]));
  }
  return tokens;
}

/**
 * Normalized-content identity: lowercase, whitespace collapsed. Duplicate
 * rejection uses the text itself, never just the filename.
 */
export function contentKey(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Counts Latin-letter tokens (`[a-z]+` sequences). This is a TOKEN COUNT, not
 * a language detector: French, Spanish, German, invented words, and other
 * Latin-script text also pass. The ≥1000-token check validates quantity only;
 * supplying text in the variant's language remains the user's responsibility.
 */
export function countEnglishWords(text: string): number {
  let count = 0;
  for (const _match of text.matchAll(/[a-z]+/gi)) count += 1;
  return count;
}

/** One shingle: W consecutive canonical tokens. */
export interface Shingle {
  index: number;
  words: string[];
}

/**
 * Splits canonical tokens into overlapping shingles of `width` words
 * (count = tokens − width + 1; fewer tokens than width → no shingles).
 */
export function buildShingles(tokens: string[], width: number): Shingle[] {
  if (width < 1) return [];
  const shingles: Shingle[] = [];
  for (let i = 0; i + width <= tokens.length; i++) {
    shingles.push({ index: i, words: tokens.slice(i, i + width) });
  }
  return shingles;
}

/** The shingle text hashed by each function: tokens joined by single spaces. */
export function shingleText(shingle: Shingle): string {
  return shingle.words.join(" ");
}

/* ------------------------------------------------------------------ */
/* SHA-1 (FIPS 180-4) — pure implementation, same code in tests and UI */
/* ------------------------------------------------------------------ */

function rotateLeft(n: number, bits: number): number {
  return ((n << bits) | (n >>> (32 - bits))) >>> 0;
}

/** Computes the SHA-1 digest of a UTF-8 string as 5 big-endian 32-bit words. */
export function sha1Words(input: string): [number, number, number, number, number] {
  const data = new TextEncoder().encode(input);
  const bitLength = data.length * 8;

  // Padded message: data + 0x80 + zeros + 64-bit length (big-endian).
  const withOne = data.length + 1;
  const paddedLength = Math.ceil((withOne + 8) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(data);
  padded[data.length] = 0x80;
  const lengthView = new DataView(padded.buffer);
  // JS numbers hold the bit length exactly for any realistic input (< 2^53).
  lengthView.setUint32(paddedLength - 8, Math.floor(bitLength / 2 ** 32));
  lengthView.setUint32(paddedLength - 4, bitLength >>> 0);

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;

  const w = new Uint32Array(80);
  for (let block = 0; block < paddedLength; block += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = lengthView.getUint32(block + i * 4);
    }
    for (let i = 16; i < 80; i++) {
      w[i] = rotateLeft(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;

    for (let i = 0; i < 80; i++) {
      let f: number;
      let k: number;
      if (i < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (i < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (i < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }
      const temp = (rotateLeft(a, 5) + f + e + k + w[i]) >>> 0;
      e = d;
      d = c;
      c = rotateLeft(b, 30);
      b = a;
      a = temp;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }

  return [h0, h1, h2, h3, h4];
}

/** SHA-1 hex digest of a UTF-8 string (lowercase, 40 chars). */
export function sha1Hex(input: string): string {
  return sha1Words(input)
    .map((word) => word.toString(16).padStart(8, "0"))
    .join("");
}

/** SHA-1 digest of a UTF-8 string as a Uint8Array (20 bytes). */
export function sha1Bytes(input: string): Uint8Array {
  const words = sha1Words(input);
  const bytes = new Uint8Array(20);
  const view = new DataView(bytes.buffer);
  words.forEach((word, i) => view.setUint32(i * 4, word));
  return bytes;
}

/* ------------------------------------------------------------------ */
/* 84 static hash functions and the comparison                         */
/* ------------------------------------------------------------------ */

/**
 * Hash function #i of a shingle: SHA-1 of the decimal salt prefix + shingle
 * text, folded to a 48-bit integer (first 6 digest bytes, big-endian). This
 * salt-prefix construction is an implementation choice — the manual only
 * requires 84 static hash functions, not their byte-level definition.
 */
export function hashShingle(salt: number, text: string): number {
  const bytes = sha1Bytes(`${salt}:${text}`);
  return (
    bytes[0] * 2 ** 40 +
    bytes[1] * 2 ** 32 +
    bytes[2] * 2 ** 24 +
    bytes[3] * 2 ** 16 +
    bytes[4] * 2 ** 8 +
    bytes[5]
  );
}

/** Raised when a text cannot produce a comparable sketch. */
export class EmptySketchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmptySketchError";
  }
}

/** Per-text result of stages 1–4: canonical form, shingles, 84 control sums. */
export interface ShingleSketch {
  /** Canonical tokens after stop-word removal and singularization. */
  tokens: string[];
  /** Overlapping shingles in order. */
  shingles: Shingle[];
  /** The i-th element is the minimum control sum of hash function #i. */
  controlSums: number[];
  /** controlSums[i] source shingle index (for evidence display). */
  controlSumSources: number[];
  /** A sketch is comparable only when at least one shingle exists. */
  valid: boolean;
}

/** Full lab configuration derived from the selected variant. */
export interface ShinglesConfig {
  /** Shingle width in words (registry «Слов в шинглах»). */
  width: number;
}

/**
 * Builds the sketch: canonicalize → shingle → hash → per-row minimum.
 * A text with no shingles yields an explicitly invalid sketch: no sentinel
 * control sums are fabricated, so two empty texts can never look identical.
 */
export function buildSketch(text: string, config: ShinglesConfig): ShingleSketch {
  const tokens = canonicalize(text);
  const shingles = buildShingles(tokens, config.width);
  const controlSums: number[] = [];
  const controlSumSources: number[] = [];

  if (shingles.length === 0) {
    return { tokens, shingles, controlSums, controlSumSources, valid: false };
  }

  for (let fn = 0; fn < HASH_FUNCTION_COUNT; fn++) {
    let min = Number.POSITIVE_INFINITY;
    let minSource = -1;
    for (const shingle of shingles) {
      const value = hashShingle(fn, shingleText(shingle));
      if (value < min) {
        min = value;
        minSource = shingle.index;
      }
    }
    controlSums.push(min);
    controlSumSources.push(minSource);
  }
  return { tokens, shingles, controlSums, controlSumSources, valid: true };
}

/** Pairwise comparison outcome (stage 5). */
export interface ShingleComparison {
  /** Index of the first text (0-based, in the input order). */
  a: number;
  /** Index of the second text. */
  b: number;
  /** How many of the 84 control sums coincide. */
  matches: number;
  /** Indices of the matching hash functions. */
  matchingFunctions: number[];
  /** matches / 84, as a fraction in [0, 1]. */
  similarity: number;
  /** Similarity in percent, rounded to 2 decimals. */
  similarityPercent: number;
}

/** Compares two valid sketches: counts equal control sums over 84 functions. */
export function compareSketches(a: ShingleSketch, b: ShingleSketch): ShingleComparison {
  if (!a.valid || !b.valid) {
    throw new EmptySketchError(
      "Сравнение невозможно: текст не образует ни одного шингла после канонизации",
    );
  }
  const matchingFunctions: number[] = [];
  for (let fn = 0; fn < HASH_FUNCTION_COUNT; fn++) {
    if (a.controlSums[fn] === b.controlSums[fn]) matchingFunctions.push(fn);
  }
  const matches = matchingFunctions.length;
  const similarity = matches / HASH_FUNCTION_COUNT;
  return {
    a: -1,
    b: -1,
    matches,
    matchingFunctions,
    similarity,
    similarityPercent: Math.round(similarity * 10000) / 100,
  };
}

/** A text with its validation status and sketch. */
export interface ShingleText {
  name: string;
  text: string;
  sketch: ShingleSketch;
}

/**
 * Compares all unordered pairs of texts (4 texts → 6 pairs) and returns the
 * comparisons in lexicographic (a, b) order. Invalid sketches fail loudly.
 */
export function compareAllPairs(texts: ShingleText[]): ShingleComparison[] {
  const result: ShingleComparison[] = [];
  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      const comparison = compareSketches(texts[i].sketch, texts[j].sketch);
      comparison.a = i;
      comparison.b = j;
      result.push(comparison);
    }
  }
  return result;
}
