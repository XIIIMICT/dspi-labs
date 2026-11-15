/**
 * Stylelint config for the project's hand-written CSS.
 *
 * Only `src/app.css` (and any future hand-written CSS files) is linted;
 * everything else is generated (`.svelte-kit/`, `build/`, `node_modules/`).
 * Tailwind runs through the `@tailwindcss/vite` plugin, so the file uses
 * `@theme`, `@apply` and other at-rules — this config allows them and does
 * not try to validate Tailwind-specific syntax.
 *
 * The rule set is correctness-first, with no formatting opinions: layout is
 * owned by `vp fmt` (oxfmt also formats CSS), and the repo's styling
 * convention is semantic utility classes plus theme variables. Stylelint
 * therefore catches real errors: invalid or duplicate declarations, unknown
 * and misspelled properties, broken selectors, and longhands that would be
 * silently collapsed into a shorthand.
 *
 * `.mjs`, not `.ts`: stylelint reads a TypeScript config through cosmiconfig,
 * which calls `typescript.findConfigFile` and `typescript.transpileModule`.
 * This project sits next to the native TypeScript (7.x) branch whose JS entry
 * point exports only `{ version }` — both calls are missing and stylelint
 * fails with `typescript.findConfigFile is not a function`. A plain ES module
 * works with any TypeScript major version.
 */
export default {
  ignoreFiles: ["**/.svelte-kit/**", "**/node_modules/**", "**/build/**"],
  rules: {
    // ── Correctness ────────────────────────────────────────────────────
    "block-no-empty": true,
    "declaration-block-no-duplicate-properties": [
      true,
      { ignore: ["consecutive-duplicates-with-different-syntaxes"] },
    ],
    "declaration-block-no-shorthand-property-overrides": true,
    "no-duplicate-selectors": true,
    "no-invalid-double-slash-comments": true,
    "no-invalid-position-at-import-rule": true,
    "property-no-unknown": [true, { ignoreProperties: ["overflow-anchor"] }],
    // `global`/`local` are Svelte/CSS-module scoping keywords; they do not
    // currently appear in .css files, but the config will not need changing
    // if styles ever move into component <style> blocks.
    "selector-pseudo-class-no-unknown": [true, { ignorePseudoClasses: ["global", "local"] }],
    "selector-pseudo-element-no-unknown": true,
    "selector-type-no-unknown": [true, { ignore: ["custom-elements"] }],
    "unit-no-unknown": true,
    "function-no-unknown": [true, { ignoreFunctions: ["theme", "--alpha", "oklch"] }],
    "at-rule-no-unknown": [
      true,
      {
        ignoreAtRules: [
          "apply",
          "config",
          "custom-variant",
          "layer",
          "plugin",
          "reference",
          "source",
          "tailwind",
          "theme",
          "utility",
          "variant",
        ],
      },
    ],

    // ── Consistency with the design system ─────────────────────────────
    "color-no-invalid-hex": true,
    "function-url-quotes": "always",
    "shorthand-property-no-redundant-values": true,
    // Longhands are kept where they are intentional: `overflow-x: auto` +
    // `overflow-y: hidden` is NOT `overflow`, and `inset: 0` would conflict
    // with four explicitly listed sides.
    "declaration-block-no-redundant-longhand-properties": [
      true,
      { ignoreShorthands: ["overflow", "inset"] },
    ],
    "media-feature-name-no-unknown": true,

    // ── Specificity hygiene ────────────────────────────────────────────
    // `!important` is legitimate here (aria libraries under shadcn-svelte
    // inline styles that have to be overridden), so it is not banned; only
    // meaningless selectors are caught.
    "no-descending-specificity": null,
    "selector-anb-no-unmatchable": true,
  },
};
