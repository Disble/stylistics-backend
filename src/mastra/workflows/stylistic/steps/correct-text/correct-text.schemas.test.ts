/**
 * Validates the structured-output schemas enforced by the correction step.
 */
import { describe, expect, it } from "bun:test";

import {
  stylisticCommentOnlySuggestionSchema,
  stylisticSuggestionSchema,
  stylisticTrackChangeSuggestionSchema,
} from "./correct-text.schemas";

/** Representative valid payload for the replacement-oriented suggestion schema. */
const validTrackChange = {
  type: "track-change" as const,
  context: "El chico corrio rapido por el pasillo.",
  anchor: "rapido",
  suggestedText: "rapidamente",
  justification: "Más preciso",
  category: "lexicon",
  severity: "medium" as const,
};

/** Representative valid payload for the comment-only suggestion schema. */
const validCommentOnly = {
  type: "comment-only" as const,
  context: "El niño corre por el parque todos los días.",
  anchor: "el niño corre",
  justification: "Estilo correcto",
  category: "style",
  severity: "low" as const,
};

describe("stylisticTrackChangeSuggestionSchema", () => {
  it("accepts a valid track-change object", () => {
    const result =
      stylisticTrackChangeSuggestionSchema.safeParse(validTrackChange);
    expect(result.success).toBe(true);
  });
});

describe("stylisticCommentOnlySuggestionSchema", () => {
  it("accepts a valid comment-only object", () => {
    const result =
      stylisticCommentOnlySuggestionSchema.safeParse(validCommentOnly);
    expect(result.success).toBe(true);
  });
});

describe("stylisticSuggestionSchema", () => {
  it("rejects an object missing the type field", () => {
    const { type: _type, ...withoutType } = validTrackChange;
    const result = stylisticSuggestionSchema.safeParse(withoutType);
    expect(result.success).toBe(false);
  });
});
