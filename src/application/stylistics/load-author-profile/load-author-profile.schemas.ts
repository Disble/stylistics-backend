import { z } from "zod";

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

export const loadAuthorProfileInputSchema = stylisticWorkflowInputSchema;
export const loadAuthorProfileOutputSchema = stylisticProfileContextSchema;
