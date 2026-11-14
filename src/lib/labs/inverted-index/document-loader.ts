/**
 * Document loading — port of `data/DocumentLoader.kt`.
 * The Android version opened files through `contentResolver` by `Uri`;
 * here text is read from `File` objects (picker or drag-and-drop) or from
 * built-in demo texts. Collection-level contract validation lives in
 * `collection-validation.ts` and runs in the store before replacing state.
 */

import type { DocumentSource } from "./models";
import { isSupportedTextFile } from "./collection-validation";

const yieldToUi = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** Wraps user-selected files as document sources, rejecting unsupported types. */
export function sourcesFromFiles(files: File[]): DocumentSource[] {
  return files
    .filter((file) => isSupportedTextFile(file.name, file.type))
    .map((file) => ({
      name: file.name,
      // Browsers do not expose a full local path; a folder selection provides
      // the relative `webkitRelativePath` instead.
      path: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
      read: () => file.text(),
    }));
}

/** Names of files rejected by `sourcesFromFiles` (for Russian error messages). */
export function unsupportedFileNames(files: File[]): string[] {
  return files
    .filter((file) => !isSupportedTextFile(file.name, file.type))
    .map((file) => file.name);
}

/**
 * Reads sources after validation. All sources are expected to be valid here;
 * any read error is reported through `emitStep` and rethrown so the caller can
 * keep the existing collection intact.
 */
export async function loadFromSources(
  sources: DocumentSource[],
  emitStep: ((message: string) => void) | null = null,
): Promise<Array<{ name: string; path: string; rawText: string }>> {
  const docs: Array<{ name: string; path: string; rawText: string }> = [];

  for (const source of sources) {
    try {
      const content = await source.read();
      docs.push({ name: source.name, path: source.path, rawText: content });
      emitStep?.(`Загружен документ: ${source.name}`);
    } catch (error) {
      const message = `Ошибка при чтении файла ${source.name}: ${error instanceof Error ? error.message : String(error)}`;
      emitStep?.(message);
      throw new Error(message);
    }
    await yieldToUi();
  }

  emitStep?.(`Всего загружено документов: ${docs.length}`);
  return docs;
}
