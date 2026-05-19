/**
 * Validates the structured-output schemas enforced by the correction step.
 */
import { describe, expect, it } from "bun:test";

import {
  correctTextInputSchema,
  portableStylisticSuggestionSchema,
  portableStylisticWorkflowOutputSchema,
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
  category: "lexico",
  severity: "medium" as const,
};

/** Representative valid payload for the comment-only suggestion schema. */
const validCommentOnly = {
  type: "comment-only" as const,
  context: "El niño corre por el parque todos los días.",
  anchor: "el niño corre",
  justification: "Estilo correcto",
  category: "estilo",
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

  it("rejects comment-only objects that still carry suggestedText internally", () => {
    const result = stylisticSuggestionSchema.safeParse({
      ...validCommentOnly,
      suggestedText: "sobrante",
    });

    expect(result.success).toBe(false);
  });
});

describe("portableStylisticSuggestionSchema", () => {
  it("accepts comment-only transport items without suggestedText", () => {
    const result =
      portableStylisticSuggestionSchema.safeParse(validCommentOnly);

    expect(result.success).toBe(true);
  });

  it("accepts track-change transport items with suggestedText", () => {
    const result =
      portableStylisticSuggestionSchema.safeParse(validTrackChange);

    expect(result.success).toBe(true);
  });
});

describe("portableStylisticWorkflowOutputSchema", () => {
  it("accepts mixed portable transport suggestions without unions in the input contract", () => {
    const result = portableStylisticWorkflowOutputSchema.safeParse({
      suggestions: [validTrackChange, validCommentOnly],
      cleanPatterns: ["uso-correcto-de-rayas"],
    });

    expect(result.success).toBe(true);
  });
});

describe("correctTextInputSchema", () => {
  it("accepts null previousCorrection for pass-through handoffs", () => {
    const result = correctTextInputSchema.safeParse({
      text: "Texto de prueba.",
      documentUuid: "44444444-4444-4444-8444-444444444444",
      genero: "general",
      authorProfile: "# Perfil",
      authorProfileCorrectionPatternsWordCount: 0,
      previousCorrection: null,
      documentContext: {
        documentId: "11111111-1111-4111-8111-111111111111",
        documentStyleProfileId: "22222222-2222-4222-8222-222222222222",
        documentPreferencesId: "33333333-3333-4333-8333-333333333333",
        documentUuid: "44444444-4444-4444-8444-444444444444",
        defaultGenre: "general",
        processingConfig: {},
      },
    });

    expect(result.success).toBe(true);
  });
});
