/**
 * Tokenization, normalization, and algorithmic stemming — port of
 * `data/TextProcessing.kt` to TypeScript.
 *
 * The processing order exactly matches the original:
 *   1) lowercase;
 *   2) replace long and short dashes (— –) with spaces;
 *   3) remove everything that is not a letter or whitespace (`[^\p{L}\s]`);
 *   4) collapse repeated whitespace (`\s+`);
 *   5) split on spaces and stem each word.
 */

/** Russian stop words — copied from the original unchanged. */
const russianStopWords = new Set<string>([
  "и",
  "в",
  "во",
  "не",
  "что",
  "он",
  "на",
  "я",
  "с",
  "со",
  "как",
  "а",
  "то",
  "все",
  "она",
  "так",
  "его",
  "но",
  "да",
  "ты",
  "к",
  "у",
  "же",
  "вы",
  "за",
  "бы",
  "по",
  "только",
  "ее",
  "мне",
  "было",
  "вот",
  "от",
  "меня",
  "еще",
  "нет",
  "о",
  "из",
  "ему",
  "теперь",
  "когда",
  "даже",
  "ну",
  "вдруг",
  "ли",
  "если",
  "уже",
  "или",
  "ни",
  "быть",
  "был",
  "него",
  "до",
  "вас",
  "нибудь",
  "опять",
  "уж",
  "вам",
  "ведь",
  "там",
  "потом",
  "себя",
  "ничего",
  "ей",
  "может",
  "они",
  "тут",
  "где",
  "есть",
  "надо",
  "ней",
  "для",
  "мы",
  "тебя",
  "их",
  "чем",
  "была",
  "сам",
  "чтоб",
  "без",
  "будто",
  "чего",
  "раз",
  "тоже",
  "себе",
  "под",
  "будет",
  "ж",
  "тогда",
  "кто",
  "этот",
  "того",
  "потому",
  "этого",
  "какой",
  "совсем",
  "ним",
  "здесь",
  "этом",
  "один",
  "почти",
  "мой",
  "тем",
  "чтобы",
  "нее",
  "сейчас",
  "были",
  "куда",
  "зачем",
  "всех",
  "можно",
  "при",
  "наконец",
  "жизнь",
  "чуть",
  "после",
  "над",
]);

/**
 * Russian suffixes for the naive algorithmic stemmer.
 * Duplicates are kept intentionally — they exist in the original Kotlin code.
 */
const russianSuffixes = [
  "ами",
  "ями",
  "ами",
  "ем",
  "ом",
  "ах",
  "ях",
  "ами",
  "ями",
  "ия",
  "ие",
  "ий",
  "ей",
  "ий",
  "ое",
  "ые",
  "ую",
  "юю",
  "у",
  "ю",
  "а",
  "я",
  "е",
  "ы",
  "и",
  "ь",
  "й",
];

/**
 * Converts text to a list of stems: lowercase, dash and non-letter removal,
 * whitespace normalization, split into words.
 */
export function tokenizeAndNormalize(text: string): string[] {
  const cleaned = text
    .toLowerCase()
    .replaceAll("\u2013", " ") // en dash
    .replaceAll("\u2014", " ") // em dash
    .replace(/[^\p{L}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length === 0) return [];
  return cleaned.split(" ").map((w) => stem(w));
}

/** Filters stop words out of a token list. */
export function removeStopWords(tokens: string[]): string[] {
  return tokens.filter((t) => t.length > 0 && !russianStopWords.has(t));
}

/**
 * Naive stemming: iterates suffixes and strips each match as long as more
 * than two characters remain (`w.length > suffix.length + 2` in the original).
 */
export function stem(word: string): string {
  let w = word;
  for (const suffix of russianSuffixes) {
    if (w.endsWith(suffix) && w.length > suffix.length + 2) {
      w = w.slice(0, w.length - suffix.length);
    }
  }
  return w;
}

/** A word with its coordinates in the source text and its stem. */
export interface WordOccurrence {
  start: number;
  end: number;
  word: string;
  stem: string;
}

/**
 * Finds all words in the text (`\p{L}+`, as in `SearchScreen.kt`) and returns
 * them with their position and stem.
 */
export function findWords(text: string): WordOccurrence[] {
  const result: WordOccurrence[] = [];
  for (const match of text.matchAll(/\p{L}+/gu)) {
    const word = match[0];
    const start = match.index ?? 0;
    result.push({
      start,
      end: start + word.length,
      word,
      stem: stem(word.toLowerCase()),
    });
  }
  return result;
}

/**
 * Collects all source word forms across the texts whose stem matches the
 * query stem (like "Show word forms" in `MainScreen.kt`).
 */
export function findWordForms(documents: { rawText: string }[], query: string): string[] {
  const normalizedQuery = stem(query.toLowerCase());
  const foundForms = new Set<string>();
  for (const doc of documents) {
    for (const occurrence of findWords(doc.rawText)) {
      if (occurrence.stem === normalizedQuery) foundForms.add(occurrence.word);
    }
  }
  return [...foundForms];
}
