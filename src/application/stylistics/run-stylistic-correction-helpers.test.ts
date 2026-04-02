import { describe, expect, it } from "bun:test";
import { normalizeSuggestions } from "./run-stylistic-correction.helpers";
import type { WorkflowSuggestion } from "./run-stylistic-correction.types";

describe("normalizeSuggestions", () => {
  it("converts track-change to comment-only when suggestedText === anchor", () => {
    const suggestions: WorkflowSuggestion[] = [
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
    const item = result[0]!;

    expect(result).toHaveLength(1);
    expect(item.type).toBe("comment-only");
    expect("suggestedText" in item).toBe(false);
    expect(item.anchor).toBe("el texto");
    expect(item.justification).toBe("Observación sin cambio");
  });

  it("leaves track-change unchanged when suggestedText !== anchor", () => {
    const suggestions: WorkflowSuggestion[] = [
      {
        type: "track-change",
        context: "El niño corre por el parque.",
        anchor: "el niño corre",
        suggestedText: "el chico corre",
        justification: "Más preciso",
        category: "lexicon",
        severity: "medium",
      },
    ];

    const result = normalizeSuggestions(suggestions);
    const item = result[0]!;

    expect(result).toHaveLength(1);
    expect(item.type).toBe("track-change");
    expect((item as { suggestedText: string }).suggestedText).toBe(
      "el chico corre",
    );
  });

  it("leaves comment-only suggestions unchanged", () => {
    const suggestions: WorkflowSuggestion[] = [
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
    const item = result[0]!;

    expect(result).toHaveLength(1);
    expect(item.type).toBe("comment-only");
    expect("suggestedText" in item).toBe(false);
  });

  it("returns empty array when given empty array", () => {
    expect(normalizeSuggestions([])).toEqual([]);
  });
});
