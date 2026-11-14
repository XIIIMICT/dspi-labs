/**
 * Narrow read-only view of the Lab 1 corpus for cross-lab reuse (Lab 3/4 may
 * select documents from it). Deliberately exposes only id, name, and text —
 * no Lab 1 UI internals, no mutation, no index access.
 *
 * The accessor is intentionally a thin mapper over the Lab 1 store snapshot
 * type so it stays pure: it takes the documents as an argument and only the
 * Svelte-side wrapper (store.svelte.ts) touches reactive state. This keeps
 * the module importable from Bun tests without the Svelte runtime.
 */

/** A document snapshot shared across labs. */
export interface CorpusDocument {
  id: number;
  name: string;
  text: string;
}

/** Maps Lab 1 documents (or any superset) to a detached plain snapshot. */
export function toCorpus(
  documents: Iterable<{ id: number; name: string; rawText: string }>,
): CorpusDocument[] {
  // Spread to detach from the reactive source: consumers get a plain copy
  // that cannot corrupt Lab 1 state.
  return [...documents].map((doc) => ({ id: doc.id, name: doc.name, text: doc.rawText }));
}
