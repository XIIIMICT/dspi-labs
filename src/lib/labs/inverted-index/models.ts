/**
 * Data models — port of `data/DocumentModels.kt` from the original
 * Android application.
 *
 * The original `Document` carried a local file path. In the browser a full
 * local path is not exposed (see AGENTS.md), and the manual only requires
 * showing the source TEXTS — so `path` is intentionally NOT part of the model.
 * `name` remains display metadata (the picked filename / demo label).
 */

/** A document: id, display name, and raw text (port of `Document`). */
export interface Document {
  id: number;
  name: string;
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
 * demo text. No local path is stored.
 */
export interface DocumentSource {
  name: string;
  read(): Promise<string>;
}
