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
  countEnglishWords,
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
    problems.push(`«${name}»: текст не содержит английских слов`);
    return problems;
  }
  if (wordCount < MIN_WORDS_PER_TEXT) {
    problems.push(
      `«${name}»: ${wordCount} английских слов — требуется не менее ${MIN_WORDS_PER_TEXT}` +
        (languageHint === "английский" ? ". По варианту задания язык текстов — английский" : ""),
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

  /** Reads `.txt` files, validates each, and appends valid ones. */
  async addFiles(files: File[]): Promise<void> {
    if (this.isProcessing) return;
    this.errors = [];
    const accepted: Lab3Candidate[] = [];
    const problems: string[] = [];

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

    if (accepted.length > 0) this.candidates.push(...accepted);
    this.errors = problems;
    if (problems.length === 0 && accepted.length > 0) {
      toast.success(`Добавлено текстов: ${accepted.length}`);
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
    if (this.candidates.some((c) => c.name === doc.name && c.text === doc.text)) {
      this.errors = [`Документ «${doc.name}» уже добавлен`];
      return;
    }
    const problems = validateLab3Candidate(doc.name, doc.text, "английский");
    if (problems.length > 0) {
      // Russian demo documents fail the English-language contract of the variant.
      this.errors = [
        ...problems,
        "Демо-коллекция ЛР 1 русскоязычна; по варианту задания языку текстов ЛР 3 нужны английские файлы",
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
  }

  removeCandidate(index: number): void {
    this.candidates.splice(index, 1);
    this.errors = [];
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
    } finally {
      this.isProcessing = false;
    }
  }

  reset(): void {
    this.candidates = [];
    this.results = [];
    this.comparisons = [];
    this.errors = [];
  }
}

export const shinglesStore = new ShinglesStore();
