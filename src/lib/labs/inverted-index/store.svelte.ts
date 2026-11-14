/**
 * Global app state — port of `MainViewModel` and the mutable state of
 * `MainActivity`. A Svelte 5 runes module keeps documents, dictionary, and
 * log shared across all screens.
 */

import { toast } from "svelte-sonner";
import { InvertedIndexBuilder } from "./inverted-index-builder";
import { loadFromSources, sourcesFromFiles } from "./document-loader";
import { generateDemoCollection } from "./demo-texts";
import type { Document, DocumentSource, TermInfo } from "./models";
import { findWordForms, stem } from "./text-processing";

/** The log keeps at most this many lines (the original showed the last 200). */
const MAX_LOG_ENTRIES = 500;

class AppStore {
  /** Loaded documents (`documents` in MainActivity). */
  documents = $state<Document[]>([]);

  /** Inverted index: stem → TermInfo (`dictionary` in MainActivity). */
  dictionary = $state<Map<string, TermInfo>>(new Map());

  /** Timestamped step log (`logs` in MainActivity). */
  logs = $state<string[]>([]);

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
    await this.loadSources(sourcesFromFiles(files), "Начало загрузки выбранных документов...");
  }

  /** Loads the built-in demo collection of 100 thematic texts. */
  async loadDemoCollection(): Promise<void> {
    await this.loadSources(generateDemoCollection(), "Начало загрузки демо-текстов...");
  }

  private async loadSources(sources: DocumentSource[], startMessage: string): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    this.documents = [];
    this.dictionary = new Map();
    this.foundForms = [];
    this.searchStem = "";

    try {
      this.emitStep(startMessage);
      const docs = await loadFromSources(sources, (m) => this.emitStep(m));
      this.documents = docs;

      if (docs.length > 0) {
        this.emitStep("Построение инвертированного индекса...");
        const builder = new InvertedIndexBuilder();
        const dictionary = await builder.build(docs, (m) => this.emitStep(m));
        this.dictionary = dictionary;
        this.emitStep("Индекс построен");
      } else {
        toast.warning("Не удалось загрузить ни одного документа");
      }
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
    this.foundForms = [];
    this.searchStem = "";
    this.searchQuery = "";
    this.logs = [];
  }
}

export const appStore = new AppStore();
