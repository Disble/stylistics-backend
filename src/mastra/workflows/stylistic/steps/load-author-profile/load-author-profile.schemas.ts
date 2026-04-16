/**
 * Declares the workflow-level schemas used to load and pass the author profile
 * through the stylistic correction pipeline.
 */
import { z } from "zod";

/** Validates the public workflow input accepted by the stylistic pipeline. */
export const stylisticWorkflowInputSchema = z.object({
  text: z.string().describe("Texto a corregir"),
  autorSlug: z
    .string()
    .default("disble")
    .describe(
      "Identificador del autor en kebab-case (ej: maria-garcia). Se usa para cargar el perfil del autor correspondiente.",
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

/** Enriches the workflow input with the resolved author profile payload. */
export const stylisticProfileContextSchema =
  stylisticWorkflowInputSchema.extend({
    authorProfilePath: z
      .string()
      .describe("Ruta absoluta resuelta del perfil del autor."),
    authorProfile: z
      .string()
      .describe(
        "Perfil del autor ya resuelto por el workflow. Es obligatorio para continuar a la corrección.",
      ),
  });

/** Reuses the public workflow input as the load-profile step input contract. */
export const loadAuthorProfileInputSchema = stylisticWorkflowInputSchema;
/** Describes the output emitted by the load-profile step. */
export const loadAuthorProfileOutputSchema = stylisticProfileContextSchema;
