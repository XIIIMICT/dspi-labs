# dspi-labs — Fix Audit Findings (agent task)

## Context

You are working in **dspi-labs**: a browser-only SvelteKit 3 + Svelte 5 (runes) SPA, TypeScript strict, Tailwind CSS 4, shadcn-svelte, built with Bun 1.4 / vite-plus (`vp`). It implements 4 DSPI course labs (variant 2/8/14) declared in `src/lib/labs/registry.json`. An external audit confirmed that all explicit requirements of `docs/Методичка.docx` are already met. Your job is to fix the specific findings below **without breaking academic compliance or existing behavior contracts**.

Hard constraints (these come from the repo's own `AGENTS.md` — follow them):

- Do **not** invent requirements the manual does not state; do **not** change lab titles, tasks, or variant mappings in `registry.json`.
- Algorithm modules under `src/lib/labs/*/` must stay **pure**: no Svelte imports, runnable under plain `bun` with no DOM.
- `store.svelte.ts` files remain the only place where browser File APIs and `svelte-sonner` toasts appear.
- Keep the UI language (Russian) and the existing shadcn-svelte component patterns.
- Whenever a decision or "implementation choice" changes, update `docs/requirements-matrix.md` and `docs/architecture.md` in the same commit. Keep the manual-vs-implementation-choice distinction intact.
- Every task below = one conventional commit (`fix:` / `feat:` / `refactor:` with scope).
- The full gate must stay green after each task: `bun run check`, `bun run test`, `bun run lint:check`, `bun run format:check`, `bun run build`.

---

## Task 1 (P1 — do first): Lab 1 stemmer fails to merge «небо»/«небе»/«неба»

**Problem.** `src/lib/labs/inverted-index/text-processing.ts` — the `russianSuffixes` list (ported from the original Kotlin app) has no bare `"о"` suffix. On the manual's own example corpus, «небо» (doc 1) stays `небо` while «небе»/«неба» (doc 3) stem to `неб`, so the pair never merges — yet the manual's illustrative Table 3 shows the merged pair «Небо | 1, 3». Not a formal violation (the manual prescribes no normalization algorithm), but it is the most likely defense question.

**Fix.**

1. Add `"о"` to `russianSuffixes` (keep the existing `w.length > suffix.length + 2` guard in `stem()` untouched).
2. Update the module header comment: the file is no longer a byte-faithful Kotlin port. Document the deliberate deviation and its reason (neuter `-о` forms must merge with their oblique forms, matching the manual's Table 3 example) plus the residual limitation (e.g. «метро» → «метр» would merge with the real «метр» — acceptable for the educational corpus).
3. Update expectations in `tests/smoke-test.mts` and `tests/labs/lab1-regression.test.mts`. Token counts and term lists **will change** — recompute the new expected values by actually running the builder, do not guess.
4. Add a row to the Lab 1 section of `docs/requirements-matrix.md` marked **Implementation choice**: the added `"о"` suffix, why, and the residual naive-stemmer limitations.

**Acceptance.** Building an index over the manual's 3-doc example («Буря мглою небо кроет…» / «Налетел порывистый ветер…» / «Закружился в небе листопад…») yields a single merged term for the небо/небе/неба family with postings for documents 1 **and** 3 (the surface form may be `неб` — the merge matters, not the string). `bun tests/smoke-test.mts` and `bun tests/labs/lab1-regression.test.mts` pass with the updated expectations.

---

## Task 2 (P1): Lab 3 canonicalization — expand the conservative singular dictionary

**Problem.** `src/lib/labs/shingles/shingles.ts` — the English singularization is deliberately conservative (a candidate from a suffix rule is accepted only if present in a local singular list), but the local lists cover only ~60 base forms. Common forms are missing.

**Fix.**

1. Extend the irregular/singular lists (e.g. `wolf/wolves`, `leaf/leaves`, `potato/potatoes`, `hero/heroes`, `criterion/criteria`, `phenomenon/phenomena`, plus more regular families: `match/matches`, `batch/batches`, `glass/glasses`, `business/businesses`, …). **Keep the strategy conservative**: still no blanket `-s` stripping; every generated candidate must be confirmed against the local list before replacing a token. Ambiguous forms (`bases`, `data`, …) must stay untouched.
2. Do **not** implement adjective removal and do **not** touch root reduction. Both are optional in the manual («часто предполагается», «иногда»); instead add an explicit comment + a `docs/requirements-matrix.md` row stating they are deliberately not implemented and why (removing adjectives changes shingle content and risks over-normalization without POS analysis).
3. Add unit tests for the newly covered forms to `tests/labs/shingles.test.mts`, including a few negative cases (words that must NOT change).

**Acceptance.** `bun tests/labs/shingles.test.mts` passes; the module header still describes the mechanism honestly (limited offline approximation, not full lemmatization).

---

## Task 3 (P2): single source of truth for "lab is implemented"

**Problem.** Two parallel mechanisms decide whether a lab is implemented: `src/lib/labs/implemented.ts` (`import.meta.glob("./​*/store.svelte.ts")` discovery) and the static folder→view map in `src/lib/labs/lab-views.ts`. The build emits `INEFFECTIVE_DYNAMIC_IMPORT` warnings for the shingles and search-quality stores (glob-imported _and_ statically imported by their views). The docs describe this split as intentional, but it is redundant.

**Fix.**

1. First `grep -rn "implemented" src tests docs AGENTS.md` and list every consumer of the `implemented` flag (`LabDefinition.implemented`, `isImplemented`, …) before touching anything.
2. Remove `implemented.ts` and the `implemented` field from `LabDefinition` in `src/lib/labs/index.ts`. `src/routes/+page.svelte` already dispatches through `getLabView()` — make that the only mechanism. If any UI/test reads `implemented`, switch it to a `getLabView(folder) !== undefined` check.
   - ⚠️ Do **not** make `index.ts` import `lab-views.ts`: `lab-views.ts` imports `.svelte` components, and `index.ts` is imported by plain-`bun` tests that must keep running without a Svelte compiler.
3. Update `tests/registry.test.mts` (and any other affected test) accordingly.
4. Update `docs/architecture.md`, `docs/requirements-matrix.md`, and `AGENTS.md` — all three currently describe the glob-discovery mechanism.

**Acceptance.** `bun run build` no longer emits `INEFFECTIVE_DYNAMIC_IMPORT`; all tests and checks stay green; docs mention exactly one mechanism.

---

## Task 4 (P2): Lab 2 — widen the hand-built stem dictionary

**Problem.** `src/lib/labs/stemming/dictionary.ts` holds 727 forms mapping to 127 stems — enough for the demo domain, thin for arbitrary student-loaded texts.

**Fix.**

1. Extend the dictionary with more frequent Russian word families (nouns across all cases, frequent verbs and adjectives, including prefixed forms). Keep it hand-curated, lowercase, offline, deterministic. Target roughly 1.5–2× the current entry count without bloating with rare forms.
2. Preserve the lookup contract in `stemming.ts` (exact match → longest prefix ≥ 3 chars; unknown words pass through unchanged). Do not change the lookup algorithm.
3. Extend `tests/labs/stemming.test.mts` with representative families (e.g. `текст/текста/тексту/текстом/текстах`, verb pairs, hyphenated words).
4. Keep the module header honest: educational scope, no claim of full linguistic coverage.

**Acceptance.** All stemming tests pass; `renderStemmedText` still preserves punctuation, whitespace, and the three casing patterns.

---

## Task 5 (P2): decompose `lab1-view.svelte` and fix the import glitch

**Problem.** `src/lib/labs/inverted-index/lab1-view.svelte` is 463 lines in one component, and line 4 contains **two `import` statements on one line** (a formatting artifact that slipped past the pre-commit hook).

**Fix.**

1. Split the double import into two lines.
2. Extract cohesive subcomponents under `src/lib/labs/inverted-index/` (suggested split): documents panel (list, drag-and-drop, demo button), search card, diagnostics card, log panel, and the document/stages modal (viewDoc + per-stage previews + "show full" state). Subcomponents read `appStore` directly, as the current monolith does — do not invent a new props/contexts layer.
3. Pure refactor: no behavior, text, or class changes; Russian UI strings stay byte-identical.

**Acceptance.** `bun run check`, `bun run lint:check`, `bun run format:check` all clean; the rendered UI is unchanged.

---

## Task 6 (P3, recommended): one Playwright e2e smoke test

**Problem.** Algorithm tests are strong, but there is zero UI test coverage — a broken dialog or tab switch would only be caught manually.

**Fix.**

1. Add `@playwright/test` as a dev dependency and create `tests/e2e/smoke.spec.ts` with a single scenario: open the app → open and close the «Задание» dialog → on Lab 1 load the demo collection and wait for a non-zero dictionary → switch to each lab tab (2, 3, 4) and confirm the expected screen headings render.
2. Add a `test:e2e` script (against `bun run build && bun run preview` or the dev server). Keep it **out** of the plain `test` script — the bun test suite must stay dependency-free.
3. Add a separate CI job in `.github/workflows/ci.yml` (cached Playwright browsers; allow it to be `continue-on-error: false`; if it turns out flaky, gate it behind `workflow_dispatch` in a follow-up rather than deleting it).
4. Update the README "Качество кода" section.

**Acceptance.** `bun run test:e2e` passes locally; CI green.

---

## Task 7 (P3, optional — skip by default): session persistence

The audit noted that a page reload loses all loaded texts and results. The repo's `AGENTS.md` and `docs/architecture.md` currently state **deliberately** that nothing is persisted. If — and only if — the maintainer explicitly wants it: add `sessionStorage` snapshots for lab inputs (texts, variant choices), update `AGENTS.md` and `docs/architecture.md` first, keep payloads size-capped, and never persist computed indexes (rebuild them). Otherwise close this as "won't fix — documented decision".

---

## Do NOT do

- Do not change variant semantics, lab numbering, or task texts in `registry.json`.
- Do not replace Lab 1's naive stemmer with a full lemmatizer or an external dependency (Task 1 is a one-suffix change).
- Do not alter the 84-hash construction (SHA-1 + salt prefix, 48-bit fold) — it is a documented implementation choice; the manual does not define the byte-level construction.
- Do not "fix" Lab 4's `d` interpretation — it correctly follows the confusion table + Fallout formula; the prose of the manual is the contradictory part.
- Do not resolve the RU/EN language conflict between Lab 1 and Lab 3 variants (it is a source conflict, surfaced honestly in the UI).
- Do not add any runtime dependency for Tasks 1–5.

## Final validation (run after all tasks)

```bash
bun run check          # svelte-check: 0 errors, 0 warnings
bun run test           # all bun test suites
bun run lint:check     # oxlint + stylelint
bun run format:check
bun run build          # no INEFFECTIVE_DYNAMIC_IMPORT warnings
bun run test:e2e       # if Task 6 done
```

Then verify `docs/requirements-matrix.md`, `docs/architecture.md`, and `AGENTS.md` still describe the code truthfully, and report: what changed per task, which tests were updated and why, and anything you could not verify.
