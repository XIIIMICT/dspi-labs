/**
 * Hybrid posting storage for Lab 1 (registry variant «Гибридная схема»).
 *
 * Manual (Методичка, ЛР 1, «Для хранения списка словопозиций»): «На практике
 * также используются гибридные схемы со связанным списком массивов
 * фиксированной длины для каждого термина». The Kotlin port used ordinary
 * dynamic arrays, so this module makes the registered scheme explicit:
 * each term owns ONE singly linked chain of fixed-capacity blocks whose items
 * are word POSITIONS (the manual's «список словопозиций»). Each block stores
 * up to BLOCK_CAPACITY positions in occurrence order and points to `next`;
 * the final block has `next = null`. Per-document posting metadata keeps
 * references to the blocks that hold that document's positions, so the
 * posting view stays deterministic without a second, competing linked list.
 *
 * Public consumers still see the historical flat `TermInfo` shape via
 * `flattenTermInfo` — this keeps the ported algorithm, frequencies, and UI
 * contracts byte-compatible while the storage itself is genuinely hybrid.
 * Pure module: no Svelte imports, deterministic traversal.
 */

import type { Posting, TermInfo } from "./models";

/** Fixed capacity of one position block (explicit, as the manual requires). */
export const BLOCK_CAPACITY = 4;

/** One fixed-capacity array block in the term's linked chain. */
export interface PositionBlock {
  /** Up to BLOCK_CAPACITY word positions, in occurrence order. */
  items: number[];
  /** Number of valid items (≤ BLOCK_CAPACITY). */
  count: number;
  /** Next block in the term's chain, or null for the tail. */
  next: PositionBlock | null;
}

/** One document's posting metadata plus the blocks holding its positions. */
export interface HybridPosting {
  docId: number;
  termFrequency: number;
  /** Blocks of this document, in creation order (elements of the term chain). */
  blocks: PositionBlock[];
}

/** Hybrid storage of one term: statistics + linked fixed-capacity blocks. */
export interface HybridTerm {
  term: string;
  docFrequency: number;
  collectionFrequency: number;
  /** Per-document postings, keyed by docId (insertion-ordered Map). */
  postings: Map<number, HybridPosting>;
  /** Head of the linked chain of fixed-capacity arrays for this term. */
  head: PositionBlock | null;
  /** Tail of the chain, for O(1) appends. */
  tail: PositionBlock | null;
}

/** Creates an empty hybrid term. */
export function createHybridTerm(term: string): HybridTerm {
  return {
    term,
    docFrequency: 0,
    collectionFrequency: 0,
    postings: new Map(),
    head: null,
    tail: null,
  };
}

/** Appends one position to a term for one document, rolling over as needed. */
export function appendPosition(term: HybridTerm, docId: number, position: number): void {
  let posting = term.postings.get(docId);
  if (posting === undefined) {
    posting = { docId, termFrequency: 0, blocks: [] };
    term.postings.set(docId, posting);
    term.docFrequency += 1;
  }

  let block = posting.blocks[posting.blocks.length - 1] ?? null;
  if (block === null || block.count === BLOCK_CAPACITY) {
    block = {
      items: Array.from({ length: BLOCK_CAPACITY }, () => 0),
      count: 0,
      next: null,
    };
    if (term.tail === null) {
      term.head = block;
    } else {
      term.tail.next = block;
    }
    term.tail = block;
    posting.blocks.push(block);
  }

  block.items[block.count] = position;
  block.count += 1;
  posting.termFrequency += 1;
  term.collectionFrequency += 1;
}

/** Deterministic traversal of the whole term chain (head → tail). */
export function* iteratePositions(head: PositionBlock | null): Generator<number> {
  let block = head;
  while (block !== null) {
    for (let i = 0; i < block.count; i++) yield block.items[i];
    block = block.next;
  }
}

/** Flattens a hybrid term into the historical `TermInfo` consumed by UI/tests. */
export function flattenTermInfo(term: HybridTerm): TermInfo {
  const postings: Posting[] = [];
  for (const posting of term.postings.values()) {
    const positions: number[] = [];
    for (const block of posting.blocks) {
      for (let i = 0; i < block.count; i++) positions.push(block.items[i]);
    }
    postings.push({
      docId: posting.docId,
      termFrequency: posting.termFrequency,
      positions,
    });
  }
  return {
    term: term.term,
    docFrequency: term.docFrequency,
    collectionFrequency: term.collectionFrequency,
    postings,
  };
}
