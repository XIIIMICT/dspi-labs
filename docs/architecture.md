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

## Lab 1 — inverted index (unchanged)

Port of the original Kotlin implementation: tokenize → stop-word removal →
suffix stemmer → `Map<stem, TermInfo>` with postings (hybrid scheme). The
screens moved from the root page into `inverted-index/lab1-view.svelte` without
behavioral changes; `/invertedIndex` and `/search/[docId]/[query]` routes are
untouched. Regression coverage in `tests/labs/lab1-regression.test.mts`.

## Lab 2 — dictionary-based stemming

Variant 2/8/14: «Стемминг словарный», Russian. Per the manual, a dictionary
stemmer matches word bases against a stem dictionary «starting from the
beginning of the word»:

- `dictionary.ts` — local offline stem dictionary (word form → base form),
  hand-built for the lab's scope; no runtime downloads.
- `stemming.ts` — pure algorithm: token spans (`\p{L}+(?:-\p{L}+)*` over the
  source, preserving offsets), lowercase lookup, exact entry first, then the
  longest dictionary key that is a proper prefix (≥ 3 chars). Hyphenated
  tokens look up each part independently. Missing words pass through
  unchanged; `renderStemmedText` rebuilds the text with stems substituted,
  preserving all punctuation/whitespace.
- The naive suffix stemmer of Lab 1 is deliberately **not** reused here.

## Lab 3 — shingle text comparison

Variant 2/8/14: SHA-1, 8-word shingles, English texts. The manual's pipeline:

1. **Canonicalization** — lowercase, English letters only, stop words
   (prepositions/conjunctions — the manual's «вспомогательные единицы») removed.
2. **Shingling** — overlapping (`внахлест`) sequences of W canonical tokens;
   count = tokens − W + 1.
3. **Hashing** — 84 static hash functions: SHA-1 of `${salt}:${shingleText}`
   with salt `0..83`, folded to a 48-bit integer. SHA-1 is a pure-TS FIPS
   180-4 implementation (`sha1Hex`/`sha1Bytes`/`sha1Words`) shared by tests
   and UI; no external hash service.
4. **Selection** — per-function minimum control sum (the manual's fixed
   sampling rule) → an 84-element sketch per text.
5. **Comparison** — matching control sums across the 84 functions;
   similarity % = matches / 84 × 100. Four texts → six unordered pairs.

Input contract (enforced in code, not just the `accept` attribute): exactly
four texts, each ≥ 1000 English words; duplicates rejected; Lab 1 corpus
documents offered for selection with the same validation (the Russian demo
collection fails the English-language rule with an explicit message).
Intermediate evidence (tokens, shingles, the 84 control sums, matching
function indices) is available in collapsible sections.

## Lab 4 — search quality evaluation

Variant 2/8/14 inherits SHA-1 / 8-word shingles / English from Lab 3 (same
table row of the manual). Retrieval scenario (the narrowest reading of
«согласно реализации своего алгоритма в лабораторной работе №3»): a designated
query text is compared to every candidate with the Lab 3 sketch; a document is
retrieved when similarity ≥ threshold. Ground truth is explicit,
user-controlled, and separate from the algorithm: documents are added as
relevant/irrelevant and can be relabeled in the UI.

- `metrics.ts` — manual formulas from confusion counts:
  P = a/(a+b), R = a/(a+c), Fallout = b/(b+d), F1 = 2PR/(P+R);
  zero denominators yield 0 (F1 = 0 when P+R = 0).
- `experiment.ts` — for each N ∈ {2, 4, 6, 8, 10}: subset = query + first N−1
  candidates (deterministic), retrieval decisions from the threshold,
  confusion counts from labels × decisions, metrics from counts. Chart data
  is the computed F1 series. Conclusions are generated from the measured
  values (no monotonicity assumption).
- The chart is a small custom SVG (no chart dependency): axis titles, grid,
  per-point labels; the exact values are in the adjacent table with a, b, c, d.

## Tests

`tests/lab-tests.mts` discovers `tests/labs/*.test.mts` (sorted). Suites:

- `registry-fields.test.mts` — per-lab variant field schemas (shared invariants
  live in `tests/registry.test.mts`).
- `lab1-regression.test.mts` — Lab 1 behavior snapshots, demo collection
  contract (100 × ≥1000 words, deterministic), corpus accessor detachment,
  and view dispatch registration.
- `stemming.test.mts` — dictionary lookups (exact/prefix/miss), 100-word
  boundary, punctuation/structure preservation, hyphens, empty input.
- `shingles.test.mts` — canonicalization, shingle count formula, SHA-1 test
  vectors, 84-function construction, identical/disjoint/partial pairs,
  4-text → 6-pair structure, 1000-word boundary.
- `search-quality.test.mts` — hand-computed metrics, zero-denominator rules,
  exact sample sizes, stable subsets, chart-data parity, threshold
  sensitivity, conclusions generation.

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
