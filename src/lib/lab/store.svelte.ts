/**
 * Глобальное состояние приложения — порт `MainViewModel` и mutable-состояний
 * `MainActivity` из Android-версии. Хранится в модуле с рунами Svelte 5,
 * поэтому все экраны видят одни и те же документы, словарь и журнал.
 */

import { toast } from "svelte-sonner";
import { InvertedIndexBuilder } from "./inverted-index-builder";
import { loadFromSources, sourcesFromFiles } from "./document-loader";
import { generateDemoCollection } from "./demo-texts";
import type { Document, DocumentSource, TermInfo } from "./models";
import { findWordForms, stem } from "./text-processing";

/** Журнал хранит не более этого числа строк (в оригинале показывались последние 200). */
const MAX_LOG_ENTRIES = 500;

class AppStore {
  /** Список загруженных документов (`documents` в MainActivity). */
  documents = $state<Document[]>([]);

  /** Инвертированный индекс: стем → TermInfo (`dictionary` в MainActivity). */
  dictionary = $state<Map<string, TermInfo>>(new Map());

  /** Журнал шагов с отметками времени (`logs` в MainActivity). */
  logs = $state<string[]>([]);

  /** Введённое слово для поиска (MainViewModel.searchQuery). */
  searchQuery = $state("");

  /** Найденные исходные формы слова (MainViewModel.searchResults + формы из лога). */
  foundForms = $state<string[]>([]);

  /** Стем последнего запроса. */
  searchStem = $state("");

  /** Признак фоновой загрузки и индексации. */
  isProcessing = $state(false);

  /** Добавляет сообщение в журнал с меткой времени (emitStep в MainActivity). */
  emitStep(message: string): void {
    const time = new Date().toLocaleTimeString("ru-RU", { hour12: false });
    this.logs.push(`[${time}] ${message}`);
    if (this.logs.length > MAX_LOG_ENTRIES) {
      this.logs.splice(0, this.logs.length - MAX_LOG_ENTRIES);
    }
  }

  /** Загрузка выбранных пользователем файлов (шаги 1–6 работы программы). */
  async loadFromFiles(files: File[]): Promise<void> {
    await this.loadSources(sourcesFromFiles(files), "Начало загрузки выбранных документов...");
  }

  /** Загрузка встроенной демо-коллекции из 100 тематических текстов. */
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
   * «Показать формы слова»: стем запроса ищется во всех документах,
   * найденные исходные формы слова выводятся в журнал (порт MainScreen).
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

  /** Номера документов, содержащих последний запрошенный стем. */
  docIdsWithSearchStem(): Set<number> {
    const info = this.dictionary.get(this.searchStem);
    return new Set(info ? info.postings.map((p) => p.docId) : []);
  }

  /** Сброс всех данных (возврат к состоянию при запуске). */
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
