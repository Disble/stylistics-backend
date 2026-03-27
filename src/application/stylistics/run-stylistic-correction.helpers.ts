import {
  GOOGLE_FICTION_SAFETY_SETTINGS,
  GOOGLE_PROVIDER_PREFIX,
} from "./run-stylistic-correction.constants";
import { stylisticWorkflowOutputSchema } from "./run-stylistic-correction.schemas";
import type {
  GoogleSafetyBlock,
  StylisticGenerateOptions,
  StylisticModelConfig,
  StylisticWorkflowInput,
} from "./run-stylistic-correction.types";

/**
 * Extracts raw model ID strings from a Mastra model config.
 * Handles single strings, ModelWithRetries arrays, and OpenAICompatibleConfig objects.
 */
export function getModelIds(model: StylisticModelConfig): string[] {
  if (typeof model === "function") return [];
  if (typeof model === "string") return [model];

  if (Array.isArray(model)) {
    return model
      .map((entry) => entry.model)
      .filter((m): m is string => typeof m === "string");
  }

  if (typeof model === "object" && model !== null) {
    if (
      "model" in model &&
      typeof (model as { model: unknown }).model === "string"
    ) {
      return [(model as { model: string }).model];
    }
    if ("id" in model && typeof (model as { id: unknown }).id === "string") {
      return [(model as { id: string }).id];
    }
  }

  return [];
}

export function hasGoogleModel(model: StylisticModelConfig): boolean {
  return getModelIds(model).some((id) => id.startsWith(GOOGLE_PROVIDER_PREFIX));
}

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
      ? "## MARCO PROFESIONAL EDITORIAL\n" +
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
export function getGoogleSafetyBlock(
  error: unknown,
): GoogleSafetyBlock | undefined {
  let current = error;

  while (isRecord(current)) {
    const payloads = [current.value, parseJson(current.responseBody)];

    for (const payload of payloads) {
      if (!isRecord(payload)) {
        continue;
      }

      const promptFeedback = isRecord(payload.promptFeedback)
        ? payload.promptFeedback
        : undefined;
      const usageMetadata = isRecord(payload.usageMetadata)
        ? payload.usageMetadata
        : undefined;
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
  model: StylisticModelConfig,
  genero: StylisticWorkflowInput["genero"],
): StylisticGenerateOptions {
  const providerOptions =
    hasGoogleModel(model) && genero === "narrativa-literaria"
      ? {
          google: {
            safetySettings: GOOGLE_FICTION_SAFETY_SETTINGS,
          },
        }
      : undefined;

  return {
    structuredOutput: { schema: stylisticWorkflowOutputSchema },
    modelSettings: { temperature: 0 },
    providerOptions,
  };
}
