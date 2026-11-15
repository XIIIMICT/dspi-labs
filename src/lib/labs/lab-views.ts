/**
 * Explicit lab view registry: folder → view component. This is the SINGLE
 * source of truth for "a lab is implemented": `src/routes/+page.svelte`
 * renders a lab only when its folder is registered here. Adding a lab view
 * means adding the folder here — an unregistered folder shows the
 * "not implemented" placeholder, so a stale store module can never render
 * the wrong screen. `index.ts` deliberately does not import this module
 * (it pulls in `.svelte` components; plain-bun tests import `index.ts`).
 */

import type { Component } from "svelte";

import Lab1View from "./inverted-index/view.svelte";
import Lab2View from "./stemming/view.svelte";
import Lab3View from "./shingles/view.svelte";
import Lab4View from "./search-quality/view.svelte";

const views: Record<string, Component> = {
  "inverted-index": Lab1View,
  stemming: Lab2View,
  shingles: Lab3View,
  "search-quality": Lab4View,
};

/** The view component registered for a lab folder, or undefined. */
export function getLabView(folder: string): Component | undefined {
  return views[folder];
}
