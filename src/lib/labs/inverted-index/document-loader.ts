/**
 * Загрузка документов — порт `data/DocumentLoader.kt`.
 * В Android-версии файлы открывались через `contentResolver` по `Uri`,
 * здесь текст читается из объектов `File` (диалог выбора или
 * drag-and-drop) либо из встроенных демо-текстов.
 */

import type { Document, DocumentSource } from "./models";
import { tokenizeAndNormalize } from "./text-processing";

const yieldToUi = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** Оборачивает выбранные пользователем файлы в источники документов. */
export function sourcesFromFiles(files: File[]): DocumentSource[] {
  return files.map((file) => ({
    name: file.name,
    // Браузер не отдаёт полный путь до файла; при выборе папки
    // доступен относительный путь `webkitRelativePath`.
    path: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
    read: () => file.text(),
  }));
}

/**
 * Читает источники, пропускает пустые файлы и файлы без слов,
 * ведёт тот же журнал сообщений, что и оригинальный `loadFromUris`.
 */
export async function loadFromSources(
  sources: DocumentSource[],
  emitStep: ((message: string) => void) | null = null,
): Promise<Document[]> {
  const docs: Document[] = [];

  for (let index = 0; index < sources.length; index++) {
    const source = sources[index];
    try {
      const content = await source.read();
      if (content.trim().length === 0) {
        emitStep?.(`Файл ${source.name} пустой, пропускаем`);
        continue;
      }

      const tokens = tokenizeAndNormalize(content);
      if (tokens.length === 0) {
        emitStep?.(`Файл ${source.name} не содержит слов, пропускаем`);
        continue;
      }

      const doc: Document = {
        id: index + 1,
        name: source.name,
        path: source.path,
        rawText: content,
      };
      docs.push(doc);
      emitStep?.(`Загружен документ: ${doc.name} (${tokens.length} слов)`);
    } catch (error) {
      emitStep?.(
        `Ошибка при чтении файла ${source.name}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    await yieldToUi();
  }

  emitStep?.(`Всего загружено документов: ${docs.length}`);
  return docs;
}
