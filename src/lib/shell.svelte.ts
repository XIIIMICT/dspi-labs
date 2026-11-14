/** Shell-level UI state shared between the header and the page. */
class ShellStore {
  /** String value of the tab selected in the header (1-based lab number). */
  activeLab = $state("1");
}

export const shellStore = new ShellStore();
