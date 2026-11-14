/**
 * Lab 2 UI state: one imported text file, validation against the assignment
 * contract (≥ 100 words), and the dictionary-stemming result. State is fully
 * isolated from the other labs.
 */

import { toast } from "svelte-sonner";
import type { StemmingResult } from "./stemming";
import { applySourceState, type Lab2Source } from "./source-state";

export { MIN_WORDS, validateLab2Source } from "./source-state";
export type { Lab2Source } from "./source-state";

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
    // Validate BEFORE touching the active source/result: a rejected
    // replacement must never discard the last successful result.
    const decision = applySourceState(source, { source: this.source, result: this.result });
    if (!decision.ok) {
      this.errors = decision.errors;
      return;
    }
    this.source = decision.next.source;
    this.result = decision.next.result;
    this.errors = decision.next.errors;
    toast.success(
      `Обработка завершена: ${decision.next.result.totalWords} слов, ${decision.next.result.matched} найдено в словаре`,
    );
  }

  reset(): void {
    // A late async file read must not restore state after an explicit reset.
    if (this.isProcessing) return;
    this.source = null;
    this.result = null;
    this.errors = [];
  }
}

export const stemmingStore = new StemmingStore();
