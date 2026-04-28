/**
 * Declares the workflow-level schemas used to load and pass the author profile
 * through the feedback pipeline.
 */
import { z } from "zod";

/** Validates the public workflow input accepted by the feedback pipeline. */
export const feedbackWorkflowInputSchema = z.object({
  category: z.string(),
  context: z.string(),
  anchor: z.string(),
  suggestedText: z.string().optional(),
  justification: z
    .string()
    .describe(
      "Justificación original del corrector. Permite al agente distinguir entre errores normativos y decisiones estilísticas intencionales.",
    ),
  action: z.enum(["accept", "reject"]),
  severity: z.enum(["high", "medium", "low"]),
  suggestionType: z.enum(["track-change", "comment-only"]),
  comment: z.string().optional(),
  autorSlug: z.string(),
});

/** Enriches the workflow input with the resolved author profile payload. */
export const feedbackProfileContextSchema = feedbackWorkflowInputSchema.extend({
  authorProfilePath: z
    .string()
    .describe("Ruta absoluta resuelta del perfil del autor."),
  authorProfile: z
    .string()
    .describe("Perfil del autor ya resuelto por el workflow."),
});

/** Reuses the public workflow input as the load-profile step input contract. */
export const loadAuthorProfileInputSchema = feedbackWorkflowInputSchema;
/** Describes the output emitted by the load-profile step. */
export const loadAuthorProfileOutputSchema = feedbackProfileContextSchema;
