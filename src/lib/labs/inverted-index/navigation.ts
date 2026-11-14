import { goto } from "$app/navigation";

/**
 * Returns to the previous screen — the web equivalent of
 * `navController.popBackStack()`. With no history (deep link), it navigates
 * to the fallback route instead.
 */
export function goBack(fallback: string): void {
  const state = history.state as { index?: number } | null;
  if ((state?.index ?? 0) > 0) {
    history.back();
  } else {
    // Navigation is intentionally fire-and-forget; SvelteKit owns route errors.
    void goto(fallback);
  }
}
