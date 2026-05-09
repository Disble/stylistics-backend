/**
 * Defines the structured-output schemas exchanged across the stylistic
 * correction workflow steps.
 */
import { z } from "zod";

import { stylisticProfileContextSchema } from "../load-author-profile/load-author-profile.schemas";

/** Canonical correction categories shared by the stylistic agent and author profiles. */
export const stylisticCorrectionCategorySchema = z.enum([
  "ortografia",
  "gramatica",
  "puntuacion",
  "tipografia",
  "lexico",
  "estilo",
]);

/** Validates one replacement-oriented suggestion emitted by the correction agent. */
export const stylisticTrackChangeSuggestionSchema = z.object({
  type: z.literal("track-change"),
  context: z
    .string()
    .describe(
      "Fragmento suficientemente largo para localizar la corrección de forma inequívoca en el documento.",
    ),
  anchor: z
    .string()
    .describe(
      "Parte exacta del texto que se resalta y reemplaza. Puede ser un solo carácter, una palabra, o un párrafo completo.",
    ),
  suggestedText: z
    .string()
    .describe("Reemplazo exacto del anchor. Nunca igual al anchor."),
  justification: z.string(),
  category: stylisticCorrectionCategorySchema,
  severity: z.enum(["high", "medium", "low"]),
});

/** Validates one editorial note that should not rewrite the source text. */
export const stylisticCommentOnlySuggestionSchema = z.object({
  type: z.literal("comment-only"),
  context: z
    .string()
    .describe(
      "Fragmento suficientemente largo para localizar el comentario de forma inequívoca en el documento.",
    ),
  anchor: z
    .string()
    .describe(
      "Parte exacta del texto sobre la que recae el comentario. No se reemplaza.",
    ),
  justification: z.string(),
  category: stylisticCorrectionCategorySchema,
  severity: z.enum(["high", "medium", "low"]),
});

/** Accepts either supported suggestion shape produced by the correction agent. */
export const stylisticSuggestionSchema = z.discriminatedUnion("type", [
  stylisticTrackChangeSuggestionSchema,
  stylisticCommentOnlySuggestionSchema,
]);

/** Describes the public workflow output returned to correction callers. */
export const stylisticWorkflowOutputSchema = z.object({
  suggestions: z
    .array(stylisticSuggestionSchema)
    .describe(
      "Corrections to apply. Each item must describe one localized change only.",
    ),
  cleanPatterns: z
    .array(z.string())
    .describe(
      "Profile patterns found in the text with positive evidence of correct usage.",
    ),
});

/** Represents the optional prior preference-focused run fed into correct-text. */
export const previousCorrectionSchema = stylisticWorkflowOutputSchema
  .nullable()
  .describe(
    "Optional previous structured correction run generated before the integrated correction step.",
  );

/** Extends the loaded profile context with the optional previous correction run. */
export const correctTextInputSchema = stylisticProfileContextSchema.extend({
  previousCorrection: previousCorrectionSchema,
});

/** Adds author identity so downstream steps can update the proper profile. */
export const stylisticCorrectionStepSchema =
  stylisticWorkflowOutputSchema.extend({
    documentContext: z.object({
      documentId: z.uuid(),
      documentStyleProfileId: z.uuid(),
      documentPreferencesId: z.uuid(),
      documentUuid: z.uuid(),
      defaultGenre: z.enum([
        "narrativa-literaria",
        "ensayo-academico",
        "periodismo-cultural",
        "general",
      ]),
      processingConfig: z.record(z.string(), z.unknown()),
    }),
    authorProfile: z
      .string()
      .describe(
        "Perfil del autor usado durante la corrección y reenviado para mantenimiento del perfil.",
      ),
    authorProfileCorrectionPatternsWordCount: z
      .number()
      .int()
      .nonnegative()
      .describe(
        "Conteo determinístico de palabras de la sección ## PATRONES VIVOS del perfil usado durante la corrección.",
      ),
  });

/** Reuses the correction-step schema as the step output contract. */
export const correctTextOutputSchema = stylisticCorrectionStepSchema;
