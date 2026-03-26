import { z } from "zod";

export const stylisticSuggestionSchema = z.object({
  originalText: z.string(),
  suggestedText: z.string(),
  justification: z.string(),
  category: z.string(),
  severity: z.enum(["high", "medium", "low"]),
});

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

export const stylisticWorkflowInputSchema = z.object({
  text: z.string().describe("Texto a corregir"),
  autorSlug: z
    .string()
    .default("Disble")
    .describe(
      "Identificador del autor en kebab-case (ej: maria-garcia). Se usa para cargar el perfil desde workspace/autores/{autorSlug}.md",
    ),
  genero: z
    .enum([
      "narrativa-literaria",
      "ensayo-academico",
      "periodismo-cultural",
      "general",
    ])
    .default("general")
    .describe("Genero del texto, para aplicar criterios especificos"),
});

export const stylisticCorrectionStepSchema =
  stylisticWorkflowOutputSchema.extend({
    autorSlug: z.string(),
  });
