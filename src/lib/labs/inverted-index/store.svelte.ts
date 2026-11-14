/**
 * Global app state — port of `MainViewModel` and the mutable state of
 * `MainActivity`. A Svelte 5 runes module keeps documents, dictionary, and
 * log shared across all screens.
 */

import { toast } from "svelte-sonner";
import { InvertedIndexBuilder } from "./inverted-index-builder";
import { loadFromSources, sourcesFromFiles, unsupportedFileNames } from "./document-loader";
import {
  collectionDiagnostics,
  validateCollection,
  type CollectionDiagnostics,
} from "./collection-validation";
import { generateDemoCollection } from "./demo-texts";
import type { Document, DocumentSource, TermInfo } from "./models";
import { findWordForms, stem, tokenizeAndNormalize } from "./text-processing";

/** The log keeps at most this many lines (the original showed the last 200). */
const MAX_LOG_ENTRIES = 500;

class AppStore {
  /** Loaded documents (`documents` in MainActivity). */
  documents = $state<Document[]>([]);

  /** Inverted index: stem → TermInfo (`dictionary` in MainActivity). */
  dictionary = $state<Map<string, TermInfo>>(new Map());

  /** Timestamped step log (`logs` in MainActivity). */
  logs = $state<string[]>([]);

  /** Inspectable repetition evidence (not a proof of thematic similarity). */
  diagnostics = $state<CollectionDiagnostics | null>(null);

  /** Collection-level validation errors, shown in Russian. */
  errors = $state<string[]>([]);

  /** Search input (MainViewModel.searchQuery). */
  searchQuery = $state("");

  /** Found source word forms (MainViewModel.searchResults + log forms). */
  foundForms = $state<string[]>([]);

  /** Stem of the latest query. */
  searchStem = $state("");

  /** Whether loading and indexing are in progress. */
  isProcessing = $state(false);

  /** Appends a timestamped message to the log (emitStep in MainActivity). */
  emitStep(message: string): void {
    const time = new Date().toLocaleTimeString("ru-RU", { hour12: false });
    this.logs.push(`[${time}] ${message}`);
    if (this.logs.length > MAX_LOG_ENTRIES) {
      this.logs.splice(0, this.logs.length - MAX_LOG_ENTRIES);
    }
  }

  /** Loads user-selected files (steps 1–6 of the original program). */
  async loadFromFiles(files: File[]): Promise<void> {
    const rejected = unsupportedFileNames(files);
    const sources = sourcesFromFiles(files);
    const errors = rejected.map((name) => `Файл «${name}»: ожидается текстовый файл (.txt)`);
    await this.loadSources(sources, "Начало загрузки выбранных документов...", errors);
  }

  /** Loads the built-in demo collection of 100 thematic texts. */
  async loadDemoCollection(): Promise<void> {
    await this.loadSources(generateDemoCollection(), "Начало загрузки демо-текстов...", []);
  }

  /**
   * Validates the replacement collection BEFORE touching current state. On
   * failure the loaded documents/index stay intact and every problem is
   * reported; on success the new collection gets stable sequential IDs.
   */
  private async loadSources(
    sources: DocumentSource[],
    startMessage: string,
    boundaryErrors: string[],
  ): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;
    this.errors = [];

    try {
      this.emitStep(startMessage);
      const validation = await validateCollection(sources);
      const errors = [...boundaryErrors, ...validation.errors];
      for (const problem of errors) this.emitStep(problem);
      if (errors.length > 0) {
        this.errors = errors;
        toast.error("Коллекция не загружена: проверьте файлы");
        return;
      }

      // Validation passed — load again from the same sources (readers are
      // re-readable) and build the index. Only now replace current state.
      const loaded = await loadFromSources(sources, (m) => this.emitStep(m));
      const docs: Document[] = loaded.map((item, i) => ({
        id: i + 1,
        name: item.name,
        path: item.path,
        rawText: item.rawText,
      }));

      this.emitStep("Построение инвертированного индекса...");
      const builder = new InvertedIndexBuilder();
      const dictionary = await builder.build(docs, (m) => this.emitStep(m));

      this.documents = docs;
      this.dictionary = dictionary;
      this.diagnostics = collectionDiagnostics(docs, (w) => stem(w), tokenizeAndNormalize);
      this.foundForms = [];
      this.searchStem = "";
      this.emitStep("Индекс построен");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.errors.push(message);
      this.emitStep(message);
      toast.error("Коллекция не загружена: проверьте файлы");
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * "Show word forms": the query stem is searched across all documents and
   * the found source forms are written to the log (port of MainScreen).
   */
  showWordForms(): void {
    const query = this.searchQuery.trim();
    if (query.length === 0) {
      toast.warning("Введите слово для поиска");
      return;
    }

    const normalizedQuery = stem(query.toLowerCase());
    const forms = findWordForms(this.documents, query);
    if (forms.length > 0) {
      this.emitStep(`Формы слова '${query}': ${forms.join(", ")}`);
    } else {
      this.emitStep(`Формы слова '${query}' не найдены`);
    }
    this.searchStem = normalizedQuery;
    this.foundForms = forms;
  }

  /** Document ids containing the latest searched stem. */
  docIdsWithSearchStem(): Set<number> {
    const info = this.dictionary.get(this.searchStem);
    return new Set(info ? info.postings.map((p) => p.docId) : []);
  }

  /** Clears all data back to the startup state. */
  reset(): void {
    if (this.isProcessing) return;
    this.documents = [];
    this.dictionary = new Map();
    this.diagnostics = null;
    this.errors = [];
    this.foundForms = [];
    this.searchStem = "";
    this.searchQuery = "";
    this.logs = [];
  }
}

export const appStore = new AppStore();
