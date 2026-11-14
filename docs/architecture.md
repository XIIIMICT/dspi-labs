# Architecture

Browser-only educational app for the DSPI course labs. Static SPA (SvelteKit 3,
`adapter-static` with `index.html` fallback); all processing runs client-side.
This document describes the multi-lab architecture introduced with Labs 2–4.

## Lab discovery and rendering

```
src/lib/labs/
  registry.json                 # ordered lab metadata (title, folder, task, variants)
  index.ts                      # only reader of registry.json; derives 1-based numbers
  implemented.ts                # store-module discovery (import.meta.glob store.svelte.ts)
  lab-views.ts                  # folder → view component map (the rendering contract)
  shared/
    lab1-corpus.ts              # pure snapshot mapper over Lab 1 documents
  inverted-index/               # Lab 1 (inverted index & dictionary)
  stemming/                     # Lab 2 (dictionary-based stemming)
  shingles/                     # Lab 3 (shingle text comparison)
  search-quality/               # Lab 4 (search quality evaluation)
```

- `registry.json` is the single source of lab identity. `index.ts` derives
  numbers and exposes `getVariantNumbers` / `getVariantInfo` / `getVariantFields`.
- A lab **renders** only when its folder is registered in `lab-views.ts`.
  The `implemented` flag from `store.svelte.ts` discovery remains a data-level
  signal, but `src/routes/+page.svelte` dispatches through `getLabView`:
  an unregistered folder shows the «not implemented» placeholder, so a stray
  store module can never render the wrong screen.
- Each lab folder holds: pure algorithm modules (no Svelte imports, runnable
  under plain `bun`), a `store.svelte.ts` (runes UI state; the only place
  `svelte-sonner` toasts and browser File APIs appear), and `view.svelte`
  (Lab 2–4) or the existing route-based screens (Lab 1).

## Shell state and variant selection

`src/lib/shell.svelte.ts` owns:

- `activeLab` — the selected tab (1-based lab number string, shared with the header).
- Per-lab variant selection, keyed by folder, with validation on lab switch:
  if the previously selected variant does not exist in the new lab, the getter
  falls back to that lab's first variant. `main-header.svelte` reads
  `shellStore.selectedVariant` and writes through `shellStore.selectVariant` —
  there is no duplicated source of truth, and lab views consume the same value.

## Cross-lab data reuse

Lab 3/4 can use documents from the Lab 1 session corpus through
`shared/lab1-corpus.ts`: `toCorpus(appStore.documents)` returns a detached
plain array of `{ id, name, text }`. The mapper is pure (takes an iterable of
Lab 1 documents), so tests import it without the Svelte runtime; the store
side stays a one-line getter. No Lab 1 UI internals are exposed, and mutation
of the snapshot cannot corrupt Lab 1 state.

All lab stores keep disjoint state: a run in one lab cannot alter another
lab's inputs or results. Nothing is persisted (no localStorage/IndexedDB);
the corpus lives in session memory only.

## Lab 1 — inverted index and dictionary

Port of the original Kotlin implementation: tokenize → stop-word removal →
suffix stemmer → `Map<stem, TermInfo>` (hybrid scheme). The ported tokenization,
stop-word list, stemmer, and log output are compatibility-sensitive and are
covered by snapshots in `tests/smoke-test.mts` / `tests/labs/lab1-regression.test.mts`.
The screens moved from the root page into `inverted-index/lab1-view.svelte`;
`/invertedIndex` and `/search/[docId]/[query]` routes are untouched.

Explicit additions for the registered variant («Гибридная схема», 2/8/14):

- `hybrid-storage.ts` — the manual's «связанный список массивов фиксированной
  длины для каждого термина»: each term owns ONE linked chain of fixed-capacity
  (`BLOCK_CAPACITY = 4`) position blocks; per-document posting metadata keeps
  references to its blocks. `flattenTermInfo()` is the deterministic adapter
  back to the historical flat `TermInfo`, so no consumer changes.
- `collection-validation.ts` — pure validation before any state replacement:
  exactly 100 documents, ≥1000 linguistic (`\p{L}+`) word tokens each, file
  type / readability / content-duplicate checks. On failure the existing
  collection and index stay intact; Russian errors are shown. Stable IDs are
  assigned only to accepted documents. `collectionDiagnostics()` exposes
  inspectable repetition evidence — it does NOT claim to prove semantic
  thematic similarity.
- `/invertedIndex` sorts terms alphabetically (the manual's representation);
  frequency remains a secondary badge. The Lab 1 view shows the variant,
  per-document processing stages (source lexemes, normalized terms, postings),
  and repeat diagnostics.
- Validation + hybrid-structure tests: `tests/labs/lab1-validation.test.mts`.

## Lab 2 — dictionary-based stemming

Variant 2/8/14: «Стемминг словарный», Russian. Per the manual, a dictionary
stemmer matches word bases against a stem dictionary «starting from the
beginning of the word»:

- `dictionary.ts` — local offline stem dictionary (word form → base form),
  hand-built for the lab's scope; no runtime downloads and no claim of full
  linguistic coverage. Unknown words pass through unchanged.
- `stemming.ts` — pure algorithm: token spans (`\p{L}+(?:-\p{L}+)*` over the
  source, preserving offsets), lowercase lookup, exact entry first, then the
  longest dictionary key that is a proper prefix (≥ 3 chars). The exact-key /
  longest-prefix rule is THIS APPLICATION'S deterministic interpretation of the
  manual's «анализ начинается с начала слова»; the manual does not define the
  key format or fallback. Hyphenated tokens look up each part independently
  and aggregate the real part-level match types. Missing words pass through
  unchanged; `renderStemmedText` preserves punctuation/whitespace AND the
  source casing of matched words (lower / Initial capital / ALL CAPS).
- The naive suffix stemmer of Lab 1 is deliberately **not** reused here.

## Lab 3 — shingle text comparison

Variant 2/8/14: SHA-1, 8-word shingles, English texts. The manual's pipeline:

1. **Canonicalization** — lowercase, English letters only, HTML-like tags and
   digits as separators, stop words (the manual's «вспомогательные единицы»)
   removed, plus conservative offline singularization of common plural nouns.
   The manual's requirement is stated in Russian morphological terms
   («приведение имен существительных в именительный падеж, единственное
   число»); for English this is a documented approximation, NOT full
   POS-aware lemmatization. Root reduction («иногда») is deliberately not
   applied. The source text is never mutated.
2. **Shingling** — overlapping (`внахлест`) sequences of W canonical tokens;
   count = tokens − W + 1.
3. **Hashing** — 84 static hash functions: SHA-1 of `${salt}:${shingleText}`
   with salt `0..83`, folded to a 48-bit integer (first 6 digest bytes,
   big-endian). SHA-1 is a pure-TS FIPS 180-4 implementation shared by tests
   and UI. The salt-prefix construction is an IMPLEMENTATION CHOICE: the manual
   requires 84 functions but does not define their byte-level construction.
   Known-answer vectors live in `tests/labs/shingles.test.mts`.
4. **Selection** — per-function minimum control sum (the manual's fixed
   sampling rule) → an 84-element sketch per text.
5. **Comparison** — matching control sums across the 84 functions;
   similarity % = matches / 84 × 100. Four texts → six unordered pairs.
   A text with zero shingles produces an explicitly INVALID sketch
   (`valid: false`, no sentinel sums); `compareSketches` throws
   `EmptySketchError` instead of manufacturing 100% similarity.

Input contract (enforced in code, not just the `accept` attribute): exactly
four texts, each ≥ 1000 English words; duplicates rejected by normalized
content, not filename; Lab 1 corpus documents offered with the same
validation. Single-flight `isProcessing` covers async reads; every candidate
mutation invalidates results/comparisons. The Lab 1 ↔ Lab 3 language conflict
is a SOURCE CONFLICT (Lab 1 variants 2/8/14 = Russian, Lab 3 = English); the
UI explains it and direct English file import (also required by the Lab 3
assignment) is the practical path.

## Lab 4 — search quality evaluation

Variant 2/8/14 inherits SHA-1 / 8-word shingles / English from Lab 3 — these
are INHERITED LAB 3 ALGORITHM SETTINGS, not an independent Lab 4 variant table
(the manual has none). Retrieval protocol (an application interpretation, NOT
literal manual instructions): a designated query text is compared to every
candidate with the Lab 3 sketch; a document is retrieved when similarity ≥
threshold. The query is a separate input and is never a returned document.
Relevance is explicit, user-supplied «эталонная разметка релевантности» — a
human judgment, not objective truth; the manual distinguishes objective
relevance from subjective pertinence.

- `metrics.ts` — manual formulas from confusion counts:
  P = a/(a+b), R = a/(a+c), Fallout = b/(b+d), F1 = 2PR/(P+R);
  zero denominators yield 0 (F1 = 0 when P+R = 0). The zero-denominator
  convention is an APPLICATION convention; the manual does not specify it.
  `d` = missed NON-relevant per the manual's confusion table and the Fallout
  formula; the manual's prose line for `d` repeats `c` and is inconsistent.
- `experiment.ts` — for each N ∈ {2, 4, 6, 8, 10}: exactly N candidates
  (query separate), so `a+b+c+d = N`; retrieval decisions from the threshold,
  confusion counts from labels × decisions. Sketches are cached by stable
  document ID (filenames may repeat). Chart data is the computed F1 series.
  Conclusions report only observed values and differences — no unsupported
  causal claims.
- `store.svelte.ts` — stable IDs for every document; any input mutation
  (add/remove, relevance toggle, query swap, threshold change) clears stale
  results and conclusions.
- The chart is a small custom SVG (no chart dependency): axis titles, grid,
  per-point labels; the exact values are in the adjacent table with a, b, c, d.

## Tests

`tests/lab-tests.mts` discovers `tests/labs/*.test.mts` (sorted). Suites:

- `registry-fields.test.mts` — per-lab variant field schemas (shared invariants
  live in `tests/registry.test.mts`).
- `lab1-regression.test.mts` — Lab 1 behavior snapshots, demo collection
  contract (100 × ≥1000 words, deterministic), corpus accessor detachment,
  and view dispatch registration.
- `lab1-validation.test.mts` — 100-document contract, 999/1000-word boundary,
  unreadable/duplicate/unsupported sources, stable IDs, hybrid linked-block
  structure (capacity, rollover, traversal, multi-document frequencies),
  alphabetical ordering, repeat diagnostics.
- `stemming.test.mts` — dictionary lookups (exact/prefix/miss), 100-word
  boundary, punctuation/structure/casing preservation, hyphenated match
  aggregation, empty input, dictionary-shape invariants.
- `shingles.test.mts` — canonicalization + singularization, shingle count
  formula, SHA-1 and salted known-answer vectors, 84-function construction,
  empty-sketch rejection, identical/disjoint/partial pairs, 4-text → 6-pair
  structure, content-based duplicate identity, 1000-word boundary.
- `search-quality.test.mts` — hand-computed metrics, zero-denominator rules,
  exact sample sizes with `a+b+c+d = N`, ID-based caching and duplicate
  filenames, threshold sensitivity, chart-data parity, evidence-based
  conclusions.

Run with `bun run test`.

## Known environment notes

- `vp lint` (Vite+ 1.6 lint) currently panics inside the oxc allocator
  (`fixed_size.rs:112`) in this sandbox **on a clean checkout too** — an
  environment/toolchain issue, not a code issue. Equivalent coverage was
  obtained with `./node_modules/.bin/oxlint src tests` (the engine `vp lint`
  wraps): 0 errors; the single pre-existing warning is the known
  `no-unused-expressions` on a runes `$effect` in the untouched Lab 1
  `search-view.svelte`, which the project's `vp lint` config explicitly
  disables for `.svelte` files.
- The committed `bun.lock` is lockfileVersion 2 (written by Bun 1.4.x). The
  sandbox's Bun 1.3.14 rewrites it to v1 on `bun install`, and building with
  the v1 lockfile makes `vp build` exceed the 4 GB memory limit. Restore the
  v2 lockfile (`git checkout -- bun.lock`) before building if a local install
  rewrote it.
