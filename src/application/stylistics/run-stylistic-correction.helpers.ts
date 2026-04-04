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
  WorkflowSuggestion,
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

  const suggestionTypes =
    "## TIPOS DE SUGERENCIA\n" +
    "Cada item en `suggestions` DEBE incluir un campo `type` con uno de estos dos valores:\n\n" +
    '### type: "track-change"\n' +
    "Usalo cuando quieras proponer un reemplazo concreto de texto.\n" +
    "Este tipo SOLO sirve cuando el cambio puede expresarse como `replace(anchor) -> suggestedText`.\n" +
    "- `context`: fragmento suficientemente largo para localizar la correccion de forma inequivoca en el documento.\n" +
    "- `anchor`: parte exacta que se resalta y reemplaza (puede ser un solo caracter, una palabra o un parrafo completo). Debe estar contenida literalmente dentro de `context`.\n" +
    "- `suggestedText`: reemplazo exacto del anchor. Debe reemplazar SOLO el anchor, nunca todo el context salvo que anchor sea ese context completo. NUNCA igual al anchor.\n" +
    "Campos requeridos: `type`, `context`, `anchor`, `suggestedText`, `justification`, `category`, `severity`.\n\n" +
    "Ejemplo valido:\n" +
    "```json\n" +
    '{ "type": "track-change", "context": "El chico corrio rapido por el pasillo.", "anchor": "rapido", "suggestedText": "rapidamente", "justification": "Adverbio de modo requiere forma adverbial, no adjetival.", "category": "gramatica", "severity": "high" }\n' +
    "```\n\n" +
    "Ejemplo invalido:\n" +
    "```json\n" +
    '{ "type": "track-change", "context": "—¡¿Ah?! ¿Por que habria de estar interesada en…?", "anchor": "¡¿Ah?!", "suggestedText": "—¡Ah! ¿Por que habria de estar interesada en…?", "justification": "Normalizacion de signos.", "category": "tipografia", "severity": "high" }\n' +
    "```\n" +
    "Es invalido porque `anchor` cubre solo un fragmento, pero `suggestedText` reescribe todo `context`. Si la correccion real abarca una region mayor, agranda el `anchor` para cubrir todo el span de reemplazo o usa `comment-only`.\n\n" +
    '### type: "comment-only"\n' +
    "Usalo cuando quieras hacer una observacion editorial SIN proponer un cambio de texto. El texto NO se toca.\n" +
    "- `context`: fragmento suficientemente largo para localizar el comentario de forma inequivoca en el documento.\n" +
    "- `anchor`: parte exacta sobre la que recae el comentario. Debe estar contenida literalmente dentro de `context`.\n" +
    "Casos de uso tipicos: senalar una eleccion estilistica discutible, advertir sobre un patron recurrente, " +
    "elogiar un uso correcto que vale la pena reforzar, o dejar una nota de contexto.\n" +
    "Campos requeridos: `type`, `context`, `anchor`, `justification`, `category`, `severity`.\n\n" +
    "Ejemplo:\n" +
    "```json\n" +
    '{ "type": "comment-only", "context": "La oscuridad lo envolvio como un manto negro.", "anchor": "como un manto negro", "justification": "Simil convencional. Evaluar si la voz autoral del perfil prefiere imagenes mas originales.", "category": "estilo", "severity": "low" }\n' +
    "```\n\n" +
    "REGLA CRITICA: `anchor` debe ser una subcadena literal de `context`. " +
    'NUNCA uses `type: "track-change"` con `anchor === suggestedText`. ' +
    'Si no hay cambio de texto que proponer, usa `type: "comment-only"`.\n\n' +
    "Checklist antes de emitir un `track-change`:\n" +
    "1. `anchor` aparece literalmente dentro de `context`.\n" +
    "2. `suggestedText !== anchor`.\n" +
    "3. `suggestedText` reemplaza solo el `anchor`, no texto fuera de ese span.\n" +
    "4. Si la correccion real requiere reescribir una region mayor, expandi el `anchor` al span exacto de reemplazo o usa `comment-only`.\n\n";

  return (
    fictionFrame +
    suggestionTypes +
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
 * Post-processes Zod-validated suggestions and converts any track-change entry
 * where suggestedText equals originalText into a comment-only suggestion.
 * This prevents no-op replacements from reaching downstream consumers.
 */
export function normalizeSuggestions(
  suggestions: WorkflowSuggestion[],
): WorkflowSuggestion[] {
  return suggestions.map((s) => {
    if (s.type === "track-change" && s.suggestedText === s.anchor) {
      const { suggestedText: _, ...rest } = s;
      return { ...rest, type: "comment-only" as const };
    }
    return s;
  });
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
