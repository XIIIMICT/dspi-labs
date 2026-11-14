/**
 * Shingle-based text comparison (ЛР 3, варианты 2/8/14: SHA-1, 8-word shingles,
 * English texts).
 *
 * Manual (Методичка, ЛР 3, «Методические указания») pipeline, in order:
 *   1) канонизация — lowercase, strip punctuation/tags, remove auxiliary
 *      words (prepositions/conjunctions — stop words);
 *   2) разбиение на шинглы — overlapping sequences of W consecutive canonical
 *      tokens («внахлест»), count = tokens − W + 1;
 *   3) вычисление хэшей — for each of the 84 static hash functions compute a
 *      control sum for every shingle;
 *   4) случайная выборка — from each of the 84 rows take the minimum control
 *      sum (the manual's fixed sampling rule);
 *   5) сравнение — count how many of the 84 selected sums coincide between two
 *      texts; similarity % = matches / 84 × 100.
 *
 * The 84 "static hash functions" are realized as SHA-1 (the registered
 * algorithm) over 84 distinct salt prefixes, giving 84 independent value
 * distributions while using one well-defined fingerprint. Everything is
 * computed locally; no network or external hash service.
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

/** Canonical tokens: lowercase letter sequences without stop words. */
export function canonicalize(text: string): string[] {
  const tokens: string[] = [];
  for (const match of text.toLowerCase().matchAll(/[a-z]+/g)) {
    if (!STOP_WORDS.has(match[0])) tokens.push(match[0]);
  }
  return tokens;
}

/** Counts English words (letter sequences) — the ≥1000-word contract check. */
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
 * text, folded to a 48-bit integer (first 6 digest bytes, big-endian). The
 * fold keeps comparisons numeric; the salts give each row its own value
 * distribution, as the manual's table of 84 functions requires.
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

/** Per-text result of stages 1–4: canonical form, shingles, 84 control sums. */
export interface ShingleSketch {
  /** Canonical tokens after stop-word removal. */
  tokens: string[];
  /** Overlapping shingles in order. */
  shingles: Shingle[];
  /** The i-th element is the minimum control sum of hash function #i. */
  controlSums: number[];
  /** controlSums[i] source shingle index (for evidence display). */
  controlSumSources: number[];
}

/** Full lab configuration derived from the selected variant. */
export interface ShinglesConfig {
  /** Shingle width in words (registry «Слов в шинглах»). */
  width: number;
}

/** Builds the sketch: canonicalize → shingle → hash → per-row minimum. */
export function buildSketch(text: string, config: ShinglesConfig): ShingleSketch {
  const tokens = canonicalize(text);
  const shingles = buildShingles(tokens, config.width);

  const controlSums: number[] = [];
  const controlSumSources: number[] = [];
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
    controlSums.push(min === Number.POSITIVE_INFINITY ? 0 : min);
    controlSumSources.push(minSource);
  }
  return { tokens, shingles, controlSums, controlSumSources };
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

/** Compares two sketches: counts equal control sums over the 84 functions. */
export function compareSketches(a: ShingleSketch, b: ShingleSketch): ShingleComparison {
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
 * comparisons in lexicographic (a, b) order.
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
