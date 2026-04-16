/**
 * Defines provider-level constants used to build deterministic generation
 * options for the stylistic correction step.
 */
export const GOOGLE_PROVIDER_PREFIX = "google/";

// Fiction can legitimately contain violent or adult material, so the workflow
// relaxes only the categories that tend to block editorial analysis by mistake.
export const GOOGLE_FICTION_SAFETY_SETTINGS = [
  {
    category: "HARM_CATEGORY_HARASSMENT",
    threshold: "BLOCK_NONE",
  },
  {
    category: "HARM_CATEGORY_HATE_SPEECH",
    threshold: "BLOCK_NONE",
  },
  {
    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
    threshold: "BLOCK_NONE",
  },
  {
    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
    threshold: "BLOCK_NONE",
  },
] as const;
