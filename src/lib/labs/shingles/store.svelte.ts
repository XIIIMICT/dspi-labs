/**
 * Lab 3 UI state: exactly four English texts (≥ 1000 words each) from files
 * or the Lab 1 corpus, sketch building, and the six pairwise comparisons.
 */

import { toast } from "svelte-sonner";
import { toCorpus } from "#lib/labs/shared/lab1-corpus";
import { appStore } from "../inverted-index/store.svelte";
import {
  buildSketch,
  compareAllPairs,
  contentKey,
  countEnglishWords,
  EmptySketchError,
  type ShingleComparison,
  type ShingleSketch,
} from "./shingles";

/** The assignment's required number of texts and minimum word count. */
export const REQUIRED_TEXTS = 4;
export const MIN_WORDS_PER_TEXT = 1000;

/** A text selected for comparison (before sketching). */
export interface Lab3Candidate {
  name: string;
  text: string;
  wordCount: number;
  origin: "file" | "lab1";
}

/** A fully processed text with its sketch. */
export interface Lab3Processed {
  name: string;
  text: string;
  wordCount: number;
  origin: "file" | "lab1";
  sketch: ShingleSketch;
}

/** Validation rules for one candidate text (pure, testable without Svelte). */
export function validateLab3Candidate(
  name: string,
  text: string,
  languageHint: "английский" | "русский",
): string[] {
  const problems: string[] = [];
  const wordCount = countEnglishWords(text);
  if (wordCount === 0) {
    problems.push(`«${name}»: текст не содержит латинских слов`);
    return problems;
  }
  if (wordCount < MIN_WORDS_PER_TEXT) {
    problems.push(
      `«${name}»: ${wordCount} латинских токенов — требуется не менее ${MIN_WORDS_PER_TEXT}` +
        (languageHint === "английский"
          ? ". По варианту задания язык текстов — английский; проверка считает токены, но не определяет язык"
          : ""),
    );
  }
  return problems;
}

class ShinglesStore {
  candidates = $state<Lab3Candidate[]>([]);
  results = $state<Lab3Processed[]>([]);
  comparisons = $state<ShingleComparison[]>([]);
  isProcessing = $state(false);
  /** Validation problems in Russian, one per rejected/invalid source. */
  errors = $state<string[]>([]);

  /** Documents available from the Lab 1 session corpus (plain snapshot). */
  get lab1Documents() {
    return toCorpus(appStore.documents);
  }

  /** Clears computed results; called on every candidate-set mutation. */
  private invalidateResults(): void {
    this.results = [];
    this.comparisons = [];
  }

  /**
   * Reads `.txt` files, validates each, and appends valid ones. A single
   * isProcessing guard covers the whole async read so concurrent selections
   * can never race past the four-text limit.
   */
  async addFiles(files: File[]): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;
    this.errors = [];
    const accepted: Lab3Candidate[] = [];
    const problems: string[] = [];

    try {
      if (this.candidates.length + files.length > REQUIRED_TEXTS) {
        this.errors = [
          `Для сравнения требуется ровно ${REQUIRED_TEXTS} текста — уже выбрано ${this.candidates.length}, добавляется ${files.length}`,
        ];
        return;
      }

      for (const file of files) {
        if (!file.name.toLowerCase().endsWith(".txt") && file.type !== "text/plain") {
          problems.push(`Файл «${file.name}»: ожидается текстовый файл (.txt)`);
          continue;
        }
        try {
          const text = await file.text();
          const fileProblems = validateLab3Candidate(file.name, text, "английский");
          if (fileProblems.length > 0) {
            problems.push(...fileProblems);
            continue;
          }
          if (
            [...this.candidates, ...accepted].some((c) => contentKey(c.text) === contentKey(text))
          ) {
            problems.push(`Файл «${file.name}»: текст уже добавлен (дубликат по содержимому)`);
            continue;
          }
          accepted.push({
            name: file.name,
            text,
            wordCount: countEnglishWords(text),
            origin: "file",
          });
        } catch (error) {
          problems.push(
            `Не удалось прочитать файл «${file.name}»: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      if (accepted.length > 0) {
        this.candidates.push(...accepted);
        this.invalidateResults();
      }
      this.errors = problems;
      if (problems.length === 0 && accepted.length > 0) {
        toast.success(`Добавлено текстов: ${accepted.length}`);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /** Appends a Lab 1 corpus document after the same validation. */
  addLab1Document(id: number): void {
    const doc = this.lab1Documents.find((d) => d.id === id);
    if (!doc) return;
    if (this.candidates.length >= REQUIRED_TEXTS) {
      this.errors = [
        `Уже выбрано ${REQUIRED_TEXTS} текста — снимите лишний, чтобы добавить другой`,
      ];
      return;
    }
    if (this.candidates.some((c) => contentKey(c.text) === contentKey(doc.text))) {
      this.errors = [`Документ «${doc.name}» уже добавлен`];
      return;
    }
    const problems = validateLab3Candidate(doc.name, doc.text, "английский");
    if (problems.length > 0) {
      // Source conflict: the assignment says "any texts from Lab 1", but the
      // variant table requires English while Lab 1 variants 2/8/14 are Russian.
      this.errors = [
        ...problems,
        "В методичке для одного номера варианта ЛР 1 (2/8/14) задан русский язык, а ЛР 3 — английский: демо-коллекция ЛР 1 не может быть использована как есть. Загрузите английские файлы напрямую (импорт из файлов также требуется заданием ЛР 3).",
      ];
      return;
    }
    this.errors = [];
    this.candidates.push({
      name: doc.name,
      text: doc.text,
      wordCount: countEnglishWords(doc.text),
      origin: "lab1",
    });
    this.invalidateResults();
  }

  removeCandidate(index: number): void {
    this.candidates.splice(index, 1);
    this.errors = [];
    this.invalidateResults();
  }

  /** Runs the full pipeline; requires exactly four valid candidates. */
  async run(width: number): Promise<void> {
    if (this.isProcessing) return;
    this.errors = [];
    if (this.candidates.length !== REQUIRED_TEXTS) {
      this.errors = [
        `Для сравнения требуется ровно ${REQUIRED_TEXTS} текста — выбрано ${this.candidates.length}`,
      ];
      return;
    }

    this.isProcessing = true;
    try {
      // Yield so the spinner renders before CPU-bound hashing.
      await new Promise((resolve) => setTimeout(resolve, 0));
      const processed: Lab3Processed[] = [];
      for (const candidate of this.candidates) {
        const sketch = buildSketch(candidate.text, { width });
        processed.push({ ...candidate, sketch });
      }
      this.results = processed;
      this.comparisons = compareAllPairs(processed);
      toast.success("Сравнение выполнено");
    } catch (error) {
      this.invalidateResults();
      this.errors = [
        error instanceof EmptySketchError
          ? error.message
          : `Не удалось выполнить сравнение: ${error instanceof Error ? error.message : String(error)}`,
      ];
    } finally {
      this.isProcessing = false;
    }
  }

  reset(): void {
    this.candidates = [];
    this.invalidateResults();
    this.errors = [];
  }
}

export const shinglesStore = new ShinglesStore();
