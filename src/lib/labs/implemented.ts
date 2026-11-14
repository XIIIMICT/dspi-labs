/**
 * A lab counts as implemented when its folder contains a `store.svelte.ts`
 * module. Discovery is build-time only (Vite), so no manual registry of
 * implemented labs is needed; add the module and the tab becomes active.
 */
const stores = import.meta.glob("./*/store.svelte.ts");

export function isImplemented(folder: string): boolean {
  return `./${folder}/store.svelte.ts` in stores;
}
