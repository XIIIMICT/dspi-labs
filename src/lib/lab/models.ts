/**
 * Модели данных — порт `data/DocumentModels.kt` из исходного
 * Android-приложения на TypeScript.
 */

/** Документ: идентификатор, имя, путь и исходный текст (порт `Document`). */
export interface Document {
  id: number;
  name: string;
  path: string;
  rawText: string;
}

/** Постинг: вхождение термина в конкретный документ (порт `Posting`). */
export interface Posting {
  docId: number;
  termFrequency: number;
  positions: number[];
}

/** Сведения о термине словаря (порт `TermInfo`). */
export interface TermInfo {
  term: string;
  docFrequency: number;
  collectionFrequency: number;
  postings: Posting[];
}

/**
 * Источник текста. В Android-версии документы открывались через
 * `contentResolver`; в браузере источник — либо выбранный пользователем
 * `File`, либо встроенный демо-текст.
 */
export interface DocumentSource {
  name: string;
  path: string;
  read(): Promise<string>;
}
