/**
 * Построение инвертированного индекса и словаря —
 * порт `data/InvertedIndexBuilder.kt` на TypeScript.
 *
 * Индекс хранится как `Map<string, TermInfo>` (аналог `HashMap`
 * из оригинала): для каждого стема — список постингов с частотой
 * термина в документе и позициями вхождений. Гибридная схема
 * оригинала сохранена: хеш-таблица даёт доступ к термину за O(1),
 * а списки постингов и позиций растут по мере необходимости.
 */

import type { Document, TermInfo } from "./models";
import { removeStopWords, tokenizeAndNormalize } from "./text-processing";

/** Пропускает ход цикла событий, чтобы логи успевали отрисовываться. */
const yieldToUi = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

export class InvertedIndexBuilder {
  private dictionary = new Map<string, TermInfo>();

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
        let info = this.dictionary.get(term);
        if (!info) {
          info = { term, docFrequency: 0, collectionFrequency: 0, postings: [] };
          this.dictionary.set(term, info);
        }
        info.collectionFrequency += 1;

        const posting = info.postings.find((p) => p.docId === doc.id);
        if (!posting) {
          info.postings.push({ docId: doc.id, termFrequency: 1, positions: [pos] });
          info.docFrequency += 1;
        } else {
          posting.termFrequency += 1;
          posting.positions.push(pos);
        }
      });

      await yieldToUi();
    }

    emitStep?.(`Построение индекса завершено. Всего терминов: ${this.dictionary.size}`);
    return this.dictionary;
  }
}
