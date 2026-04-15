import { z } from "zod";

import type { StylisticWorkflowInput } from "../load-author-profile/load-author-profile.types";
import {
  GOOGLE_FICTION_SAFETY_SETTINGS,
  GOOGLE_PROVIDER_PREFIX,
} from "./correct-text.constants";
import { stylisticWorkflowOutputSchema } from "./correct-text.schemas";
import type {
  GoogleSafetyBlock,
  StylisticGenerateOptions,
  StylisticModelConfig,
  WorkflowSuggestion,
} from "./correct-text.types";

const googleSafetyPayloadSchema = z.object({
  promptFeedback: z.object({
    blockReason: z.string(),
    safetyRatings: z.array(z.unknown()).optional(),
  }),
  usageMetadata: z
    .object({
      promptTokenCount: z.number().optional(),
      totalTokenCount: z.number().optional(),
    })
    .optional(),
});

const googleErrorMetadataSchema = z.object({
  statusCode: z.number().optional(),
  name: z.string().optional(),
  message: z.string().optional(),
});

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
      .filter(
        (candidate): candidate is string => typeof candidate === "string",
      );
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

function getSafetyPayloads(current: Record<string, unknown>): unknown[] {
  return [current.value, parseJson(current.responseBody)];
}

function buildSafetyBlockFromPayload(
  current: Record<string, unknown>,
  payload: unknown,
): GoogleSafetyBlock | undefined {
  const parsedPayload = googleSafetyPayloadSchema.safeParse(payload);

  if (!parsedPayload.success) {
    return undefined;
  }

  const errorMetadata = googleErrorMetadataSchema.safeParse(current);
  const { promptFeedback, usageMetadata } = parsedPayload.data;
  const metadata = errorMetadata.success ? errorMetadata.data : {};

  return {
    blockReason: promptFeedback.blockReason,
    statusCode: metadata.statusCode,
    errorName: metadata.name,
    errorMessage: metadata.message,
    promptTokenCount: usageMetadata?.promptTokenCount,
    totalTokenCount: usageMetadata?.totalTokenCount,
    safetyRatings: promptFeedback.safetyRatings,
  };
}

function getSafetyBlockFromCurrentError(
  current: Record<string, unknown>,
): GoogleSafetyBlock | undefined {
  for (const payload of getSafetyPayloads(current)) {
    const safetyBlock = buildSafetyBlockFromPayload(current, payload);

    if (safetyBlock) {
      return safetyBlock;
    }
  }

  return undefined;
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
    const safetyBlock = getSafetyBlockFromCurrentError(current);

    if (safetyBlock) {
      return safetyBlock;
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
  return suggestions.map((suggestion) => {
    if (
      suggestion.type === "track-change" &&
      suggestion.suggestedText === suggestion.anchor
    ) {
      const { suggestedText: _suggestedText, ...rest } = suggestion;
      return { ...rest, type: "comment-only" };
    }
    return suggestion;
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
  let providerOptions: StylisticGenerateOptions["providerOptions"];

  if (hasGoogleModel(model) && genero === "narrativa-literaria") {
    providerOptions = {
      google: {
        safetySettings: GOOGLE_FICTION_SAFETY_SETTINGS,
      },
    };
  }

  return {
    structuredOutput: {
      schema: stylisticWorkflowOutputSchema,
      model,
    },
    modelSettings: { temperature: 0 },
    providerOptions,
  };
}
