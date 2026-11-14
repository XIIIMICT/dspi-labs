/**
 * Explicit lab view registry: folder → view component. A lab is rendered by
 * `src/routes/+page.svelte` only when its folder is present here; the
 * `implemented` flag derived from `store.svelte.ts` discovery stays a data-level
 * signal, while this map is the actual rendering contract. Adding a lab view
 * means adding the folder here — an unregistered folder still shows the
 * "not implemented" placeholder, so a stale store module can never render
 * the wrong screen.
 */

import type { Component } from "svelte";

import Lab1View from "./inverted-index/lab1-view.svelte";
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
