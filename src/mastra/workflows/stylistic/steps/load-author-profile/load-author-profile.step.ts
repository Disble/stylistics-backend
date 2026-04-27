/**
 * Implements the author-profile loading step for the stylistic workflow.
 */
import { createStep } from "@mastra/core/workflows";
import { logger } from "../../../../utils/logger";
import {
  countAuthorProfileObservationsCharacters,
  loadRequiredAuthorProfileText,
  resolveAuthorProfilePath,
} from "./load-author-profile.helpers";
import {
  loadAuthorProfileInputSchema,
  loadAuthorProfileOutputSchema,
} from "./load-author-profile.schemas";

// Step 1 resolves the author profile as explicit workflow state so profile IO
// remains visible in Mastra traces before any model call happens.
export const loadAuthorProfile = createStep({
  id: "load-author-profile",
  description:
    "Carga el perfil del autor y lo adjunta al contexto antes de corregir el texto",
  inputSchema: loadAuthorProfileInputSchema,
  outputSchema: loadAuthorProfileOutputSchema,
  execute: async ({ inputData }) => {
    // Resolve the path first so both success and error logs point to the same file.
    const authorProfilePath = resolveAuthorProfilePath(inputData.autorSlug);

    logger.info(
      {
        autorSlug: inputData.autorSlug,
        authorProfilePath,
      },
      "📚 Cargando perfil del autor",
    );

    let authorProfile: string;

    try {
      // The stylistic workflow requires a concrete profile before correction.
      ({ authorProfile } = await loadRequiredAuthorProfileText(
        inputData.autorSlug,
      ));
    } catch (error) {
      logger.error(
        {
          autorSlug: inputData.autorSlug,
          authorProfilePath,
          error,
        },
        "❌ No se pudo resolver el perfil del autor",
      );

      throw error;
    }

    const authorProfileObservationsCharacterCount =
      countAuthorProfileObservationsCharacters(authorProfile);

    logger.info(
      {
        autorSlug: inputData.autorSlug,
        authorProfilePath,
        authorProfileObservationsCharacterCount,
      },
      "✅ Perfil del autor resuelto",
    );

    return {
      ...inputData,
      authorProfilePath,
      authorProfile,
      authorProfileObservationsCharacterCount,
    };
  },
});
