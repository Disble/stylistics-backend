import { stylisticWorkflowOutputSchema } from "./run-stylistic-correction.schemas";
import type {
  GoogleSafetyBlock,
  StylisticGenerateOptions,
  StylisticWorkflowInput,
} from "./run-stylistic-correction.types";

const GOOGLE_PROVIDER_PREFIX = "google/";

// Fiction can legitimately contain violent or adult material, so the workflow
// relaxes only the categories that tend to block editorial analysis by mistake.
const googleFictionSafetySettings = [
  {
    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
    threshold: "BLOCK_ONLY_HIGH",
  },
  {
    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
    threshold: "BLOCK_ONLY_HIGH",
  },
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function getNumber(value: unknown) {
  return typeof value === "number" ? value : undefined;
}

function parseJson(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

export function isGoogleModel(model: string) {
  return model.startsWith(GOOGLE_PROVIDER_PREFIX);
}

/**
 * Builds the correction prompt from workflow input while keeping the genre-
 * specific editorial framing in one place.
 */
export function buildPrompt(input: StylisticWorkflowInput) {
  const fictionFrame =
    input.genero === "narrativa-literaria"
      ?
          "## MARCO PROFESIONAL EDITORIAL\n" +
          "Esta solicitud corresponde a una correccion ortotipografica y de estilo en una casa editorial. " +
          "El texto es ficcion literaria y el analisis pedido es linguistico y estilistico, no de contenido. " +
          "La presencia de violencia, conflicto, lenguaje adulto o temas oscuros puede ser material editorial legitimo del genero.\n\n"
      : "";

  return (
    fictionFrame +
    `Lee primero el perfil del autor en autores/${input.autorSlug}.md. Si no existe, segui sin contexto previo.\n\n` +
    `Genero del texto: ${input.genero}\n\n` +
    `Texto a corregir:\n${input.text}\n\n` +
    "Aplica correccion ortotipografica y de estilo integrada respetando la voz autoral. " +
    "Usa el perfil como checklist activo para detectar errores recurrentes y tambien patrones usados correctamente."
  );
}

/**
 * Walks the nested provider error chain and extracts Gemini safety metadata when
 * the request was blocked before structured output could be produced.
 */
export function getGoogleSafetyBlock(error: unknown): GoogleSafetyBlock | undefined {
  let current = error;

  while (isRecord(current)) {
    const payloads = [current.value, parseJson(current.responseBody)];

    for (const payload of payloads) {
      if (!isRecord(payload)) {
        continue;
      }

      const promptFeedback = isRecord(payload.promptFeedback) ? payload.promptFeedback : undefined;
      const usageMetadata = isRecord(payload.usageMetadata) ? payload.usageMetadata : undefined;
      const blockReason = getString(promptFeedback?.blockReason);

      if (!blockReason) {
        continue;
      }

      return {
        blockReason,
        statusCode: getNumber(current.statusCode),
        errorName: getString(current.name),
        errorMessage: getString(current.message),
        promptTokenCount: getNumber(usageMetadata?.promptTokenCount),
        totalTokenCount: getNumber(usageMetadata?.totalTokenCount),
        safetyRatings: Array.isArray(promptFeedback?.safetyRatings)
          ? promptFeedback.safetyRatings
          : undefined,
      };
    }

    current = current.cause;
  }

  return undefined;
}

/**
 * Centralizes generation options so schema enforcement, determinism, and
 * provider-specific overrides stay aligned across workflow callers.
 */
export function buildGenerateOptions(
  model: string,
  genero: StylisticWorkflowInput["genero"],
): StylisticGenerateOptions {
  const providerOptions =
    isGoogleModel(model) && genero === "narrativa-literaria"
      ? {
          google: {
            safetySettings: googleFictionSafetySettings,
          },
        }
      : undefined;

  return {
    structuredOutput: { schema: stylisticWorkflowOutputSchema },
    modelSettings: { temperature: 0 },
    providerOptions,
  };
}
