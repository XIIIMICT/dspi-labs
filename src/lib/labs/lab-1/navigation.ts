import { goto } from "$app/navigation";

/**
 * Возврат на предыдущий экран — аналог `navController.popBackStack()`
 * из Android-версии. Если истории нет (страница открыта по прямой
 * ссылке), выполняется переход на запасной маршрут.
 */
export function goBack(fallback: string): void {
  const state = history.state as { index?: number } | null;
  if ((state?.index ?? 0) > 0) {
    history.back();
  } else {
    // goto возвращает промис, который намеренно не ждём: навигация
    // fire-and-forget, ошибки перехода обрабатываются самим SvelteKit.
    void goto(fallback);
  }
}
