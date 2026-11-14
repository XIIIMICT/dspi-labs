import adapter from "@sveltejs/adapter-static";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, lazyPlugins } from "vite-plus";

const basePath = process.env.BASE_PATH ?? "";

// SvelteKit accepts only "" or "/path" (leading slash, no trailing slash);
// invalid env values fall back to the site root instead of failing the build.
// The cast is safe because the condition mirrors SvelteKit's rule.
const base: "" | `/${string}` =
  basePath.length > 1 && basePath.startsWith("/") && !basePath.endsWith("/")
    ? (basePath as `/${string}`)
    : "";

export default defineConfig({
  fmt: {},
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    // typeAware enables type-aware rules (no-floating-promises etc.).
    // typeCheck stays off: tsgolint misreads .svelte re-exports and emits
    // false TS2614 for shadcn components; svelte-check owns type validation.
    options: { typeAware: true, typeCheck: false },
    overrides: [
      {
        // Svelte 5 idiom: a bare $state read inside $effect subscribes to the
        // value; the no-unused-expressions rule does not recognise it.
        files: ["src/**/*.svelte"],
        rules: { "no-unused-expressions": "off" },
      },
    ],
  },
  // Pre-commit checks for staged files (vp hooks + `vp staged`).
  staged: {
    "*.{js,jsx,mjs,cjs,ts,tsx,mts,cts,json,jsonc}": ["vp fmt", "vp lint --fix"],
    "*.svelte": "vp lint --fix",
    "*.{css,scss}": ["vp fmt", "stylelint --fix"],
    "*.md": "vp fmt",
  },
  plugins: lazyPlugins(() => [
    tailwindcss(),
    sveltekit({
      compilerOptions: {
        // Force runes mode for the project, except for libraries. Can be removed in svelte 6.
        runes: ({ filename }) =>
          filename.split(/[/\\]/).includes("node_modules") ? undefined : true,
      },

      // Fully static SPA: index.html is the fallback for every route; data
      // lives in the browser only.
      adapter: adapter({
        fallback: "index.html",
      }),

      paths: {
        // GitHub Pages serves from /<repo>/, so base is set at build time:
        // the deploy workflow exports BASE_PATH.
        base: base,
      },
    }),
  ]),
});
