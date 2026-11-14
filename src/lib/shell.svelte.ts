import { getVariantNumbers, labs } from "#lib/labs";

/** Shell-level UI state shared between the header, the page, and lab views. */
class ShellStore {
  /** String value of the tab selected in the header (1-based lab number). */
  activeLab = $state("1");

  /**
   * Selected variant number per lab folder. Keyed by folder so switching labs
   * keeps each lab's own choice; the header reads and writes the active lab's
   * entry. Only labs that expose variants get an entry.
   */
  private selectedVariants = $state<Record<string, number>>({});

  /** The registry definition of the active lab (falls back to the first). */
  get activeLabDefinition() {
    return labs.find((l) => String(l.number) === this.activeLab) ?? labs[0];
  }

  /** Currently selected variant number of the active lab. */
  get selectedVariant(): number {
    const lab = this.activeLabDefinition;
    const numbers = getVariantNumbers(lab);
    const stored = this.selectedVariants[lab.folder];
    return stored !== undefined && numbers.includes(stored) ? stored : (numbers[0] ?? 0);
  }

  /** Selects a variant for the active lab (ignored when not in its set). */
  selectVariant(variant: number): void {
    const lab = this.activeLabDefinition;
    if (getVariantNumbers(lab).includes(variant)) {
      this.selectedVariants[lab.folder] = variant;
    }
  }
}

export const shellStore = new ShellStore();
