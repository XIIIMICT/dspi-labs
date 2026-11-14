/**
 * Lab 4 UI state: builds the evaluation collection (query + candidates with
 * explicit relevance labels), runs the sample-size experiment, holds results.
 */

import { toast } from "svelte-sonner";
import { countEnglishWords } from "../shingles/shingles";
import {
  buildConclusions,
  runExperiment,
  SAMPLE_SIZES,
  type EvaluationDocument,
  type ExperimentResult,
} from "./experiment";

/** Minimum words per text (inherited from the Lab 3 assignment contract). */
export const MIN_WORDS_PER_TEXT = 1000;
/** The largest required sample size; the query is a separate input. */
export const REQUIRED_CANDIDATES = SAMPLE_SIZES[SAMPLE_SIZES.length - 1];

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
  /** Monotonic counter for stable IDs (filenames may repeat). */
  private nextId = 1;

  /** Clears any result computed from a previous input state. */
  private invalidateResults(): void {
    this.result = null;
    this.conclusions = [];
  }

  /** Adds a `.txt` file as a document with the given relevance label. */
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
      this.documents.push({ id: `doc-${this.nextId++}`, name: file.name, text, relevant });
      this.invalidateResults();
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
    this.invalidateResults();
  }

  /** Flips the explicit relevance label of a document. */
  toggleRelevant(index: number): void {
    const doc = this.documents[index];
    if (doc) {
      this.documents[index] = { ...doc, relevant: !doc.relevant };
      this.invalidateResults();
    }
  }

  /** Swaps a document into the query position ([0]). */
  makeQuery(index: number): void {
    if (index <= 0 || index >= this.documents.length) return;
    const [doc] = this.documents.splice(index, 1);
    this.documents.unshift(doc);
    this.invalidateResults();
  }

  /** Updates the retrieval threshold and drops stale results. */
  setThreshold(value: number): void {
    if (!Number.isFinite(value)) return;
    this.thresholdPercent = Math.min(100, Math.max(0, value));
    this.invalidateResults();
  }

  /**
   * Runs the experiment at sizes 2, 4, 6, 8, 10. Requires the query plus at
   * least 10 candidates so the largest sample is fully covered; fewer is an
   * error, not a partial result.
   */
  async run(width: number): Promise<void> {
    if (this.isProcessing) return;
    this.errors = [];
    if (this.documents.length < REQUIRED_CANDIDATES + 1) {
      this.errors.push(
        `Для выборок ${SAMPLE_SIZES.join(", ")} документов требуется отдельный запрос и не менее ${REQUIRED_CANDIDATES} кандидатов — добавлено ${this.documents.length} документов (запрос + ${Math.max(0, this.documents.length - 1)} кандидатов)`,
      );
      this.invalidateResults();
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
    } catch (error) {
      this.invalidateResults();
      this.errors.push(
        `Не удалось выполнить оценку: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      this.isProcessing = false;
    }
  }

  reset(): void {
    this.documents = [];
    this.nextId = 1;
    this.thresholdPercent = 20;
    this.invalidateResults();
    this.errors = [];
  }
}

export const searchQualityStore = new SearchQualityStore();
