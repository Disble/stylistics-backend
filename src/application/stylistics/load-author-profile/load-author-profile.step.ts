import {
  loadRequiredAuthorProfileText,
  resolveAuthorProfilePath,
} from "./load-author-profile.helpers";
import type {
  LoadAuthorProfileLogger,
  StylisticProfileContext,
  StylisticWorkflowInput,
} from "./load-author-profile.types";

/**
 * Loads the author profile and returns the enriched correction context.
 */
export async function executeLoadAuthorProfileStep({
  input,
  logger,
  basePath,
}: {
  input: StylisticWorkflowInput;
  logger: LoadAuthorProfileLogger;
  basePath?: string;
}): Promise<StylisticProfileContext> {
  const authorProfilePath = resolveAuthorProfilePath(input.autorSlug, basePath);

  logger.info(
    {
      autorSlug: input.autorSlug,
      authorProfilePath,
    },
    "📚 Cargando perfil del autor",
  );

  let authorProfile: string;

  try {
    ({ authorProfile } = await loadRequiredAuthorProfileText(
      input.autorSlug,
      basePath,
    ));
  } catch (error) {
    logger.error(
      {
        autorSlug: input.autorSlug,
        authorProfilePath,
        error,
      },
      "❌ No se pudo resolver el perfil del autor",
    );

    throw error;
  }

  logger.info(
    {
      autorSlug: input.autorSlug,
      authorProfilePath,
    },
    "✅ Perfil del autor resuelto",
  );

  return {
    ...input,
    authorProfilePath,
    authorProfile,
  };
}
