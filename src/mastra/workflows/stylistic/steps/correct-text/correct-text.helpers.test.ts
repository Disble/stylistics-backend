/**
 * Verifies normalization, provider safety parsing, and generation-option
 * assembly for the colocated correction helpers.
 */
import { describe, expect, it } from "bun:test";

import { GOOGLE_FICTION_SAFETY_SETTINGS } from "./correct-text.constants";
import {
  buildGenerateOptions,
  getGoogleSafetyBlock,
  normalizeSuggestion,
  normalizeSuggestions,
  normalizeWorkflowOutput,
} from "./correct-text.helpers";
import type { PortableWorkflowSuggestion } from "./correct-text.types";

describe("normalizeSuggestions", () => {
  it("converts track-change to comment-only when suggestedText === anchor", () => {
    const suggestions: PortableWorkflowSuggestion[] = [
      {
        type: "track-change",
        context: "Aquí está el texto completo de contexto.",
        anchor: "el texto",
        suggestedText: "el texto",
        justification: "Observación sin cambio",
        category: "estilo",
        severity: "low",
      },
    ];

    const result = normalizeSuggestions(suggestions);
    expect(result).toHaveLength(1);

    const [item] = result;

    if (!item) {
      throw new Error("Expected a normalized suggestion");
    }

    expect(item.type).toBe("comment-only");
    expect("suggestedText" in item).toBe(false);
    expect(item.anchor).toBe("el texto");
    expect(item.justification).toBe("Observación sin cambio");
  });

  it("leaves track-change unchanged when suggestedText !== anchor", () => {
    const suggestions: PortableWorkflowSuggestion[] = [
      {
        type: "track-change",
        context: "El niño corre por el parque.",
        anchor: "el niño corre",
        suggestedText: "el chico corre",
        justification: "Más preciso",
        category: "lexico",
        severity: "medium",
      },
    ];

    const result = normalizeSuggestions(suggestions);
    expect(result).toHaveLength(1);

    const [item] = result;

    if (!item) {
      throw new Error("Expected a normalized suggestion");
    }

    expect(item.type).toBe("track-change");
    expect((item as { suggestedText: string }).suggestedText).toBe(
      "el chico corre",
    );
  });

  it("leaves comment-only suggestions unchanged", () => {
    const suggestions: PortableWorkflowSuggestion[] = [
      {
        type: "comment-only",
        context: "La oscuridad lo envolvió como un manto.",
        anchor: "La oscuridad lo envolvió.",
        justification: "Símil convencional.",
        category: "estilo",
        severity: "low",
      },
    ];

    const result = normalizeSuggestions(suggestions);
    expect(result).toHaveLength(1);

    const [item] = result;

    if (!item) {
      throw new Error("Expected a normalized suggestion");
    }

    expect(item.type).toBe("comment-only");
    expect("suggestedText" in item).toBe(false);
  });

  it("returns empty array when given empty array", () => {
    expect(normalizeSuggestions([])).toEqual([]);
  });
});

describe("normalizeSuggestion", () => {
  it("downgrades track-change without suggestedText to comment-only", () => {
    const result = normalizeSuggestion({
      type: "track-change",
      context: "Era tarde y la casa seguia despierta.",
      anchor: "seguia",
      justification: "Hace falta revisar la tildación.",
      category: "ortografia",
      severity: "high",
    });

    expect(result).toEqual({
      type: "comment-only",
      context: "Era tarde y la casa seguia despierta.",
      anchor: "seguia",
      justification: "Hace falta revisar la tildación.",
      category: "ortografia",
      severity: "high",
    });
  });

  it("drops suggestedText from explicit comment-only transport items", () => {
    const result = normalizeSuggestion({
      type: "comment-only",
      context: "La oscuridad lo envolvió como un manto.",
      anchor: "como un manto",
      suggestedText: "no debería pasar",
      justification: "Observación editorial.",
      category: "estilo",
      severity: "low",
    });

    expect(result).toEqual({
      type: "comment-only",
      context: "La oscuridad lo envolvió como un manto.",
      anchor: "como un manto",
      justification: "Observación editorial.",
      category: "estilo",
      severity: "low",
    });
  });
});

describe("normalizeWorkflowOutput", () => {
  it("validates the transport payload and returns the internal workflow shape", () => {
    const result = normalizeWorkflowOutput({
      suggestions: [
        {
          type: "track-change",
          context: "Era tarde y la casa seguia despierta.",
          anchor: "seguia",
          suggestedText: "seguía",
          justification: "Hace falta revisar la tildación.",
          category: "ortografia",
          severity: "high",
        },
        {
          type: "comment-only",
          context: "La oscuridad lo envolvió como un manto.",
          anchor: "como un manto",
          suggestedText: "ignorar",
          justification: "Observación editorial.",
          category: "estilo",
          severity: "low",
        },
      ],
      cleanPatterns: ["sin-abuso-de-comas"],
    });

    expect(result).toEqual({
      suggestions: [
        {
          type: "track-change",
          context: "Era tarde y la casa seguia despierta.",
          anchor: "seguia",
          suggestedText: "seguía",
          justification: "Hace falta revisar la tildación.",
          category: "ortografia",
          severity: "high",
        },
        {
          type: "comment-only",
          context: "La oscuridad lo envolvió como un manto.",
          anchor: "como un manto",
          justification: "Observación editorial.",
          category: "estilo",
          severity: "low",
        },
      ],
      cleanPatterns: ["sin-abuso-de-comas"],
    });
  });
});

describe("buildGenerateOptions", () => {
  it("returns structured output without provider overrides for non-fiction genres", () => {
    const options = buildGenerateOptions("ensayo-academico");

    expect(options.structuredOutput.schema).toBeDefined();
    expect(options.modelSettings.temperature).toBe(0);
    expect(options.providerOptions).toBeUndefined();
    expect(options.system).toBeUndefined();
  });

  it("keeps fiction safety overrides for narrative texts using a mutable copy", () => {
    const options = buildGenerateOptions("narrativa-literaria");
    const safetySettings = options.providerOptions?.google?.safetySettings;
    const expectedSafetySettings = GOOGLE_FICTION_SAFETY_SETTINGS.map(
      (setting) => ({
        category: setting.category,
        threshold: setting.threshold,
      }),
    );

    expect(safetySettings).toBeDefined();
    expect(safetySettings).toEqual(expectedSafetySettings);
    expect(safetySettings).not.toBe(GOOGLE_FICTION_SAFETY_SETTINGS);
    expect(options.structuredOutput.schema).toBeDefined();
  });
});

describe("getGoogleSafetyBlock", () => {
  it("extracts nested Gemini safety metadata from the provider error chain", () => {
    const error = new Error("agent failed", {
      cause: {
        cause: {
          statusCode: 400,
          name: "GoogleGenerativeAIError",
          message: "Candidate blocked for safety reasons",
          responseBody: JSON.stringify({
            promptFeedback: {
              blockReason: "SAFETY",
              safetyRatings: [{ category: "HARM_CATEGORY_DANGEROUS_CONTENT" }],
            },
            usageMetadata: {
              promptTokenCount: 123,
              totalTokenCount: 456,
            },
          }),
        },
      },
    });

    expect(getGoogleSafetyBlock(error)).toEqual({
      blockReason: "SAFETY",
      statusCode: 400,
      errorName: "GoogleGenerativeAIError",
      errorMessage: "Candidate blocked for safety reasons",
      promptTokenCount: 123,
      totalTokenCount: 456,
      safetyRatings: [{ category: "HARM_CATEGORY_DANGEROUS_CONTENT" }],
    });
  });

  it("returns undefined when the error does not contain a provider safety payload", () => {
    expect(getGoogleSafetyBlock(new Error("plain failure"))).toBeUndefined();
  });
});
