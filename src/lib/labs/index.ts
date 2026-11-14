import registry from "./registry.json";
import { isImplemented } from "./implemented";

/** A variant dictionary: a set of variant numbers plus lab-specific fields. */
export interface LabVariant {
  variants: number[];
  [key: string]: unknown;
}

/** A lab entry from registry.json; its 1-based number is its array position. */
export interface LabDefinition {
  /** Full lab title (also used as the dialog description). */
  title: string;
  /** Semantic folder name under src/lib/labs/. */
  folder: string;
  /** Plain-text assignment, shown verbatim (whitespace preserved). */
  task: string;
  /** Variant dictionaries; a specific variant is found via its `variants` set. */
  variants: LabVariant[];
  /** 1-based ordinal number, derived from the registry order. */
  number: number;
  /** Whether the lab has an implementation module (a `store.svelte.ts`). */
  implemented: boolean;
}

export const labs: LabDefinition[] = (
  registry as Omit<LabDefinition, "number" | "implemented">[]
).map((entry, index) => ({
  ...entry,
  number: index + 1,
  implemented: isImplemented(entry.folder),
}));

/** All variant numbers of a lab, ascending — the header select items. */
export function getVariantNumbers(lab: LabDefinition): number[] {
  return [...new Set(lab.variants.flatMap((entry) => entry.variants))].sort((a, b) => a - b);
}

/** The variant dictionary matching a given variant number. */
export function getVariantInfo(lab: LabDefinition, variant: number): LabVariant | undefined {
  return lab.variants.find((entry) => entry.variants.includes(variant));
}

/** Lab-specific fields of a variant dictionary, excluding `variants` itself. */
export function getVariantFields(info: LabVariant | undefined): [string, unknown][] {
  if (!info) return [];
  return Object.entries(info).filter(([key]) => key !== "variants");
}
