// Приложение полностью клиентское: документы загружаются и
// обрабатываются в браузере, поэтому SSR отключаем и собираем
// статический SPA (см. adapter-static с fallback в vite.config.ts).
export const ssr = false;
export const prerender = false;
