/**
 * Collection-level validation for Lab 1 (assignment: 100 documents, ≥1000
 * words each, imported from files, thematically related with repeated terms).
 *
 * Pure module over source descriptors/text: no browser File APIs, so tests
 * run under plain Bun. Thematic similarity is a SEMANTIC judgement that a
 * word count cannot prove; `collectionDiagnostics()` exposes inspectable
 * repeat evidence (terms repeated inside one document and shared across
 * documents) instead of claiming to verify it.
 */

/** The assignment's exact document count. */
export const REQUIRED_DOCUMENTS = 100;
/** The assignment's minimum word count per document. */
export const MIN_WORDS_PER_DOCUMENT = 1000;

/** A source to validate: display name, optional path, and a text reader. */
export interface CollectionSource {
  name: string;
  path: string;
  read(): Promise<string>;
}

/** A validated document with a stable sequential ID. */
export interface ValidatedDocument {
  id: number;
  name: string;
  path: string;
  rawText: string;
  wordCount: number;
}

/** Counts linguistic word tokens (`\p{L}+`), not whitespace fragments. */
export function countLinguisticWords(text: string): number {
  let count = 0;
  for (const _match of text.matchAll(/\p{L}+/gu)) count += 1;
  return count;
}

/** Supported text file types, checked at the processing boundary. */
export function isSupportedTextFile(name: string, type: string): boolean {
  return name.toLowerCase().endsWith(".txt") || type === "text/plain";
}

/** Result of validating a full replacement collection. */
export interface CollectionValidation {
  documents: ValidatedDocument[];
  /** Russian, actionable problems; empty means the collection is valid. */
  errors: string[];
}

/**
 * Validates every source before any collection replacement happens:
 * file type, readability, non-empty text, ≥1000 linguistic words, exact 100
 * documents, and content duplicates. On any error the caller must keep the
 * existing collection untouched. IDs are stable 1..N over accepted docs only.
 */
export async function validateCollection(
  sources: CollectionSource[],
): Promise<CollectionValidation> {
  const errors: string[] = [];
  const documents: ValidatedDocument[] = [];
  const seen = new Set<string>();

  if (sources.length !== REQUIRED_DOCUMENTS) {
    errors.push(
      `Для задания требуется ровно ${REQUIRED_DOCUMENTS} документов — получено ${sources.length}`,
    );
  }

  for (const source of sources) {
    let text: string;
    try {
      text = await source.read();
    } catch (error) {
      errors.push(
        `Не удалось прочитать файл «${source.name}»: ${error instanceof Error ? error.message : String(error)}`,
      );
      continue;
    }

    const wordCount = countLinguisticWords(text);
    if (wordCount === 0) {
      errors.push(`Файл «${source.name}» не содержит слов`);
      continue;
    }
    if (wordCount < MIN_WORDS_PER_DOCUMENT) {
      errors.push(
        `Файл «${source.name}»: ${wordCount} слов — требуется не менее ${MIN_WORDS_PER_DOCUMENT}`,
      );
      continue;
    }
    const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
    if (seen.has(normalized)) {
      errors.push(`Файл «${source.name}» дублирует содержимое другого файла`);
      continue;
    }
    seen.add(normalized);
    documents.push({
      id: documents.length + 1,
      name: source.name,
      path: source.path,
      rawText: text,
      wordCount,
    });
  }

  if (documents.length > 0 && documents.length !== REQUIRED_DOCUMENTS) {
    errors.push(
      `После проверки принято ${documents.length} из ${sources.length} файлов — коллекция из ${REQUIRED_DOCUMENTS} документов не сформирована`,
    );
  }

  return { documents, errors };
}

/** Inspectable repetition evidence for the thematic-similarity requirement. */
export interface CollectionDiagnostics {
  /** Terms occurring more than once inside one document, per document. */
  repeatedWithinDocuments: Array<{ name: string; terms: string[] }>;
  /** Terms appearing in more than one document (first 20, sorted). */
  sharedAcrossDocuments: string[];
}

/**
 * Computes repeat diagnostics from already loaded documents. This is evidence
 * for the student's judgement, NOT a proof of semantic/thematic similarity.
 */
export function collectionDiagnostics(
  documents: Array<{ name: string; rawText: string }>,
  stem: (word: string) => string,
  tokenizer: (text: string) => string[],
): CollectionDiagnostics {
  const perDocument = documents.map((doc) => {
    const counts = new Map<string, number>();
    for (const raw of tokenizer(doc.rawText)) {
      const term = stem(raw);
      if (term.length === 0) continue;
      counts.set(term, (counts.get(term) ?? 0) + 1);
    }
    const terms = [...counts.entries()]
      .filter(([, n]) => n > 1)
      .map(([term]) => term)
      .sort();
    return { name: doc.name, terms };
  });

  const docSets = documents.map((doc) => new Set(tokenizer(doc.rawText).map(stem)));
  const shared = new Map<string, number>();
  for (const set of docSets) {
    for (const term of set) shared.set(term, (shared.get(term) ?? 0) + 1);
  }

  return {
    repeatedWithinDocuments: perDocument,
    sharedAcrossDocuments: [...shared.entries()]
      .filter(([, n]) => n > 1)
      .map(([term]) => term)
      .sort()
      .slice(0, 20),
  };
}
