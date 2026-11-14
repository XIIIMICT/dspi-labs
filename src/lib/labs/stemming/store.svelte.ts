/**
 * Lab 2 UI state: one imported text file, validation against the assignment
 * contract (≥ 100 words), and the dictionary-stemming result. State is fully
 * isolated from the other labs.
 */

import { toast } from "svelte-sonner";
import { countWords, stemText, type StemmingResult } from "./stemming";

/** The assignment's minimum word count for the imported text. */
export const MIN_WORDS = 100;

/** A text selected for processing (from a file or typed in). */
export interface Lab2Source {
  name: string;
  text: string;
}

/**
 * Validates a source against the assignment contract. Pure, so tests can
 * check the rejection rules without the Svelte store.
 */
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

class StemmingStore {
  source = $state<Lab2Source | null>(null);
  result = $state<StemmingResult | null>(null);
  isProcessing = $state(false);
  /** Validation problems keyed by field, in Russian for direct display. */
  errors = $state<string[]>([]);

  /** Accepts a `.txt` file, reads it, validates, and runs the algorithm. */
  async loadFile(file: File): Promise<void> {
    if (this.isProcessing) return;
    this.errors = [];
    if (!file.name.toLowerCase().endsWith(".txt") && file.type !== "text/plain") {
      this.errors.push(`Файл «${file.name}»: ожидается текстовый файл (.txt)`);
      return;
    }
    this.isProcessing = true;
    try {
      const text = await file.text();
      this.applySource({ name: file.name, text });
    } catch (error) {
      this.errors.push(
        `Не удалось прочитать файл «${file.name}»: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      this.isProcessing = false;
    }
  }

  /** Validates the word-count contract and runs dictionary stemming. */
  applySource(source: Lab2Source): void {
    this.source = source;
    this.result = null;

    const problems = validateLab2Source(source);
    if (problems.length > 0) {
      this.errors = problems;
      return;
    }

    this.errors = [];
    this.result = stemText(source.text);
    toast.success(
      `Обработка завершена: ${this.result.totalWords} слов, ${this.result.matched} найдено в словаре`,
    );
  }

  reset(): void {
    this.source = null;
    this.result = null;
    this.errors = [];
  }
}

export const stemmingStore = new StemmingStore();
