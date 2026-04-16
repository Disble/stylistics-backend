/**
 * Collects deterministic helpers for generation options, provider safety
 * parsing, and structured-output normalization in the correction step.
 */
import { z } from "zod";

import type { StylisticWorkflowInput } from "../load-author-profile/load-author-profile.types";
import { GOOGLE_FICTION_SAFETY_SETTINGS } from "./correct-text.constants";
import { stylisticWorkflowOutputSchema } from "./correct-text.schemas";
import type {
  GoogleSafetyBlock,
  StylisticGenerateOptions,
  WorkflowSuggestion,
} from "./correct-text.types";

/** Validates Google provider safety payloads nested in thrown errors. */
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

/** Extracts generic provider error metadata that is useful for logging. */
const googleErrorMetadataSchema = z.object({
  statusCode: z.number().optional(),
  name: z.string().optional(),
  message: z.string().optional(),
});

/** Narrows unknown values to plain records before inspecting provider errors. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Parses provider response bodies only when the payload was serialized as JSON. */
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

/** Returns every candidate payload location used by Google safety failures. */
function getSafetyPayloads(current: Record<string, unknown>): unknown[] {
  return [current.value, parseJson(current.responseBody)];
}

/** Builds one normalized safety-block payload from a raw provider error body. */
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

/** Tries each known payload slot in the current provider error frame. */
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
 * Converts no-op track-change suggestions into comment-only suggestions so the
 * downstream document integration never receives redundant replacements.
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
 * provider-specific overrides stay aligned inside the colocated correction step.
 */
export function buildGenerateOptions(
  genero: StylisticWorkflowInput["genero"],
): StylisticGenerateOptions {
  let providerOptions: StylisticGenerateOptions["providerOptions"];

  if (genero === "narrativa-literaria") {
    providerOptions = {
      google: {
        safetySettings: GOOGLE_FICTION_SAFETY_SETTINGS.map((setting) => ({
          category: setting.category,
          threshold: setting.threshold,
        })),
      },
    };
  }

  return {
    structuredOutput: {
      schema: stylisticWorkflowOutputSchema,
    },
    modelSettings: { temperature: 0 },
    providerOptions,
  };
}
