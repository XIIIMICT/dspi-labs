/**
 * Shared viewer state for Lab 1 screens: the search card opens a document,
 * the document/stages modal renders it. Kept here (not passed through props)
 * so sibling components stay independent, matching the project's store pattern.
 */

import type { Document } from "./models";

class Lab1ViewState {
  viewDoc = $state<Document | null>(null);
  viewOpen = $state(false);
  /** Source text starts expanded; stages stay collapsed. */
  sourceTextOpen = $state(true);

  open(doc: Document): void {
    this.viewDoc = doc;
    this.sourceTextOpen = true;
    this.viewOpen = true;
  }
}

export const lab1ViewState = new Lab1ViewState();
