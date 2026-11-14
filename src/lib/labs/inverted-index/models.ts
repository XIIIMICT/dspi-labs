/**
 * Data models — port of `data/DocumentModels.kt` from the original
 * Android application.
 */

/** A document: id, name, path, and raw text (port of `Document`). */
export interface Document {
  id: number;
  name: string;
  path: string;
  rawText: string;
}

/** A posting: one term occurrence in a document (port of `Posting`). */
export interface Posting {
  docId: number;
  termFrequency: number;
  positions: number[];
}

/** Dictionary term statistics (port of `TermInfo`). */
export interface TermInfo {
  term: string;
  docFrequency: number;
  collectionFrequency: number;
  postings: Posting[];
}

/**
 * Text source. The Android version opened documents via `contentResolver`;
 * in the browser a source is either a user-selected `File` or a built-in
 * demo text.
 */
export interface DocumentSource {
  name: string;
  path: string;
  read(): Promise<string>;
}
