/**
 * Stylelint для рукописного CSS проекта.
 *
 * Линтуется только `src/app.css` (и любые будущие «свои» CSS-файлы):
 * остальное — сгенерированное (`.svelte-kit/`, `build/`, `node_modules/`).
 * Tailwind работает через плагин `@tailwindcss/vite`, поэтому файл
 * использует `@theme`, `@apply` и прочие at-rules — конфиг разрешает их
 * и не пытается валидировать неизвестный синтаксис Tailwind.
 *
 * Набор правил — correctness-first, без претензий на форматирование:
 * раскладкой владеет `vp fmt` (oxfmt форматирует и CSS), а стилистическая
 * конвенция репозитория — семантические utility-классы плюс переменные
 * темы. Поэтому stylelint ловит реальные ошибки: невалидные или дубли
 * объявления, неизвестные и опечатанные свойства, сломанные селекторы,
 * лонгхенды, которые молча схлопнутся в шортхенд.
 *
 * `.mjs`, а не `.ts`: stylelint читает TypeScript-конфиг через
 * cosmiconfig, который вызывает `typescript.findConfigFile` и
 * `typescript.transpileModule`. Проект живёт рядом с нативной веткой
 * TypeScript (7.x), чья JS-точка входа экспортирует только `{ version }`,
 * — оба вызова отсутствуют, и stylelint падает с
 * `typescript.findConfigFile is not a function`. Обычный ES-модуль
 * работает при любой мажорной версии TypeScript.
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
		// `global`/`local` — синтаксис скоупинга Svelte/CSS-модулей; в .css
		// файлах он сейчас не встречается, но конфиг не придётся трогать,
		// если стиль когда-нибудь переедет в <style> блоки компонентов.
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
		// Лонгхенды остаются там, где они намеренные: `overflow-x: auto` +
		// `overflow-y: hidden` — это НЕ `overflow`, а `inset: 0` конфликтует
		// с четырьмя выписанными рядом сторонами.
		"declaration-block-no-redundant-longhand-properties": [
			true,
			{ ignoreShorthands: ["overflow", "inset"] },
		],
		"media-feature-name-no-unknown": true,

		// ── Specificity hygiene ────────────────────────────────────────────
		// `!important` здесь легитимен (aria-библиотеки, которые стоят под
		// shadcn-svelte, инлайнят стили, которые приходится перекрывать), так
		// что под запрет он не попадает; ловятся только бессмысленные селекторы.
		"no-descending-specificity": null,
		"selector-anb-no-unmatchable": true,
	},
};
