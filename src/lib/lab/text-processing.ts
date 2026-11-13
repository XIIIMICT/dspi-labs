/**
 * Токенизация, нормализация и алгоритмический стемминг —
 * порт `data/TextProcessing.kt` на TypeScript.
 *
 * Порядок обработки текста полностью повторяет оригинал:
 *   1) приведение к нижнему регистру;
 *   2) замена длинных и коротких тире (— –) на пробелы;
 *   3) удаление всего, что не буква и не пробел (`[^\p{L}\s]`);
 *   4) сведение повторяющихся пробелов к одному (`\s+`);
 *   5) разбиение по пробелу и стемминг каждого слова.
 */

/** Русские стоп-слова — список перенесён из оригинала без изменений. */
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
 * Русские суффиксы для наивного алгоритмического стемминга.
 * Дубли в списке сохранены — так было в оригинальном Kotlin-коде.
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
 * Превращает текст в список стемов: нижний регистр, удаление тире и
 * небуквенных символов, нормализация пробелов, разбиение на слова.
 */
export function tokenizeAndNormalize(text: string): string[] {
  const cleaned = text
    .toLowerCase()
    .replaceAll("\u2013", " ") // короткое тире
    .replaceAll("\u2014", " ") // длинное тире
    .replace(/[^\p{L}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length === 0) return [];
  return cleaned.split(" ").map((w) => stem(w));
}

/** Убирает из списка служебные слова (стоп-слова). */
export function removeStopWords(tokens: string[]): string[] {
  return tokens.filter((t) => t.length > 0 && !russianStopWords.has(t));
}

/**
 * Наивный стемминг: последовательно перебирает суффиксы и срезает
 * каждый подходящий, если после обрезки остаётся больше двух символов
 * (условие `w.length > suffix.length + 2` из оригинала).
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

/** Слово с координатами в исходном тексте и его стемом. */
export interface WordOccurrence {
  start: number;
  end: number;
  word: string;
  stem: string;
}

/**
 * Находит все слова в тексте (`\p{L}+`, как в `SearchScreen.kt`)
 * и возвращает их вместе с позицией и стемом.
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
 * Собирает все исходные формы слова, встречающиеся в текстах,
 * стем которых совпадает со стемом запроса (как «Показать формы
 * слова» в `MainScreen.kt`).
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
