import { z } from "zod";

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
  category: z.string(),
  severity: z.enum(["high", "medium", "low"]),
});

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
  category: z.string(),
  severity: z.enum(["high", "medium", "low"]),
});

export const stylisticSuggestionSchema = z.discriminatedUnion("type", [
  stylisticTrackChangeSuggestionSchema,
  stylisticCommentOnlySuggestionSchema,
]);

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

export const stylisticCorrectionStepSchema =
  stylisticWorkflowOutputSchema.extend({
    autorSlug: z.string(),
  });

export const correctTextOutputSchema = stylisticCorrectionStepSchema;
export { stylisticProfileContextSchema as correctTextInputSchema } from "../load-author-profile/load-author-profile.schemas";
