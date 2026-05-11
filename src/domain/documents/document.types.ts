import type { DOCUMENT_GENRES } from "./document.constants";

/** Supported document-genre values shared across document persistence flows. */
export type DocumentGenre = (typeof DOCUMENT_GENRES)[number];
