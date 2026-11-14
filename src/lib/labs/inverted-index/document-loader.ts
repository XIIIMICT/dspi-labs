/**
 * Document loading — port of `data/DocumentLoader.kt`.
 * The Android version opened files through `contentResolver` by `Uri`;
 * here text is read from `File` objects (picker or drag-and-drop) or from
 * built-in demo texts.
 */

import type { Document, DocumentSource } from "./models";
import { tokenizeAndNormalize } from "./text-processing";

const yieldToUi = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** Wraps user-selected files as document sources. */
export function sourcesFromFiles(files: File[]): DocumentSource[] {
  return files.map((file) => ({
    name: file.name,
    // Browsers do not expose a full local path; a folder selection provides
    // the relative `webkitRelativePath` instead.
    path: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
    read: () => file.text(),
  }));
}

/**
 * Reads sources, skips empty or wordless files, and emits the same step log
 * as the original `loadFromUris`.
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
