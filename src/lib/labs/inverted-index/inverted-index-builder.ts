/**
 * Inverted index and dictionary builder — port of
 * `data/InvertedIndexBuilder.kt` to TypeScript, with the registered hybrid
 * storage scheme made explicit.
 *
 * Manual (Методичка, ЛР 1): «На практике также используются гибридные схемы
 * со связанным списком массивов фиксированной длины для каждого термина».
 * The dictionary remains a `Map` for O(1) term lookup; each term's word
 * positions now live in a linked chain of fixed-capacity blocks
 * (`hybrid-storage.ts`). The public `build()` result is flattened back into
 * the historical `TermInfo` shape so the ported algorithm, frequencies,
 * positions, UI, and Lab 3 corpus accessor stay unchanged.
 */

import type { Document, TermInfo } from "./models";
import { removeStopWords, tokenizeAndNormalize } from "./text-processing";
import {
  appendPosition,
  createHybridTerm,
  flattenTermInfo,
  type HybridTerm,
} from "./hybrid-storage";

/** Yields to the event loop so log lines can render between steps. */
const yieldToUi = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

export class InvertedIndexBuilder {
  /** Hybrid storage: stem → linked fixed-capacity position blocks. */
  private hybrid = new Map<string, HybridTerm>();

  /** Inspectable hybrid structure (for evidence/tests, not UI mutation). */
  get hybridDictionary(): ReadonlyMap<string, HybridTerm> {
    return this.hybrid;
  }

  async build(
    documents: Document[],
    emitStep: ((message: string) => void) | null = null,
  ): Promise<Map<string, TermInfo>> {
    emitStep?.(`Начало построения индекса для ${documents.length} документов`);

    for (const doc of documents) {
      emitStep?.(`Обработка документа: ${doc.name} (${doc.id})`);
      const tokens = tokenizeAndNormalize(doc.rawText);
      emitStep?.(` - Токенизация завершена: ${tokens.length} токенов`);

      const filtered = removeStopWords(tokens);
      emitStep?.(` - Удалены стоп-слова: ${filtered.length} токенов осталось`);

      filtered.forEach((term, pos) => {
        let info = this.hybrid.get(term);
        if (!info) {
          info = createHybridTerm(term);
          this.hybrid.set(term, info);
        }
        appendPosition(info, doc.id, pos);
      });

      await yieldToUi();
    }

    emitStep?.(`Построение индекса завершено. Всего терминов: ${this.hybrid.size}`);

    // Deterministic flattening adapter for all consumers.
    const dictionary = new Map<string, TermInfo>();
    for (const [term, hybrid] of this.hybrid) {
      dictionary.set(term, flattenTermInfo(hybrid));
    }
    return dictionary;
  }
}
