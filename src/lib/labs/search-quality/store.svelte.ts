/**
 * Lab 4 UI state: builds the evaluation collection (query + candidates with
 * explicit relevance labels), runs the sample-size experiment, holds results.
 */

import { toast } from "svelte-sonner";
import { countEnglishWords } from "../shingles/shingles";
import {
  buildConclusions,
  runExperiment,
  type EvaluationDocument,
  type ExperimentResult,
} from "./experiment";

/** Minimum words per text (inherited from the Lab 3 assignment contract). */
export const MIN_WORDS_PER_TEXT = 1000;

/** Validation rules for one evaluation document (pure, no Svelte). */
export function validateEvaluationText(name: string, text: string): string[] {
  const problems: string[] = [];
  const wordCount = countEnglishWords(text);
  if (wordCount < MIN_WORDS_PER_TEXT) {
    problems.push(
      `Файл «${name}»: ${wordCount} английских слов — требуется не менее ${MIN_WORDS_PER_TEXT} (язык текстов по варианту — английский)`,
    );
  }
  return problems;
}

class SearchQualityStore {
  /** Evaluation collection: [0] is the query; labels are explicit. */
  documents = $state<EvaluationDocument[]>([]);
  result = $state<ExperimentResult | null>(null);
  conclusions = $state<string[]>([]);
  isProcessing = $state(false);
  /** Retrieval threshold in similarity percent. */
  thresholdPercent = $state(20);
  errors = $state<string[]>([]);

  /** Adds a `.txt` file as a document with the given ground-truth label. */
  async addFile(file: File, relevant: boolean): Promise<void> {
    if (this.isProcessing) return;
    this.errors = [];
    if (!file.name.toLowerCase().endsWith(".txt") && file.type !== "text/plain") {
      this.errors.push(`Файл «${file.name}»: ожидается текстовый файл (.txt)`);
      return;
    }
    this.isProcessing = true;
    try {
      const text = await file.text();
      const problems = validateEvaluationText(file.name, text);
      if (problems.length > 0) {
        this.errors = problems;
        return;
      }
      this.documents.push({ name: file.name, text, relevant });
      toast.success(
        relevant
          ? `Релевантный документ добавлен: ${file.name}`
          : `Нерелевантный документ добавлен: ${file.name}`,
      );
    } catch (error) {
      this.errors.push(
        `Не удалось прочитать файл «${file.name}»: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      this.isProcessing = false;
    }
  }

  removeDocument(index: number): void {
    this.documents.splice(index, 1);
    this.errors = [];
  }

  /** Flips the relevance label of a document (ground truth is user-visible). */
  toggleRelevant(index: number): void {
    const doc = this.documents[index];
    if (doc) this.documents[index] = { ...doc, relevant: !doc.relevant };
  }

  /** Swaps a document into the query position ([0]). */
  makeQuery(index: number): void {
    if (index <= 0 || index >= this.documents.length) return;
    const [doc] = this.documents.splice(index, 1);
    this.documents.unshift(doc);
  }

  /**
   * Runs the experiment at sizes 2, 4, 6, 8, 10. Requires the query plus at
   * least 9 candidates so the largest sample is fully covered; fewer is an
   * error, not a partial result.
   */
  async run(width: number): Promise<void> {
    if (this.isProcessing) return;
    this.errors = [];
    if (this.documents.length < 10) {
      this.errors.push(
        `Для выборок 2, 4, 6, 8 и 10 документов требуется запрос и не менее 9 кандидатов — добавлено ${this.documents.length}`,
      );
      return;
    }
    this.isProcessing = true;
    try {
      await new Promise((resolve) => setTimeout(resolve, 0));
      const result = runExperiment(this.documents, {
        width,
        thresholdPercent: this.thresholdPercent,
      });
      this.result = result;
      this.conclusions = buildConclusions(result.samples);
      toast.success("Оценка качества поиска выполнена");
    } finally {
      this.isProcessing = false;
    }
  }

  reset(): void {
    this.documents = [];
    this.result = null;
    this.conclusions = [];
    this.errors = [];
  }
}

export const searchQualityStore = new SearchQualityStore();
