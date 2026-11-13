import adapter from "@sveltejs/adapter-static";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, lazyPlugins } from "vite-plus";

export default defineConfig({
  fmt: {},
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    // typeAware включает type-aware правила (no-floating-promises и т.п.).
    // typeCheck отключён: tsgolint не понимает экспорты из .svelte и сыплет
    // ложными TS2614 на реэкспорты shadcn-компонентов; типы проверяет
    // svelte-check (`bun run check`).
    options: { typeAware: true, typeCheck: false },
    overrides: [
      {
        // Идиома Svelte 5: голая ссылка на $state внутри $effect — способ
        // подписаться на значение; правило «неиспользуемого выражения» её
        // не понимает.
        files: ["src/**/*.svelte"],
        rules: { "no-unused-expressions": "off" },
      },
    ],
  },
  // Проверки стейдженных файлов на каждый коммит (vp hooks + `vp staged`).
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

      // Полностью статическая сборка (SPA): все маршруты обслуживаются
      // страницей-заглушкой index.html, данные живут только в браузере.
      adapter: adapter({
        fallback: "index.html",
      }),
    }),
  ]),
});
