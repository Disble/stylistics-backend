/**
 * Verifies that the feedback prompt keeps all workspace paths relative after
 * the workflow refactor.
 */
import { describe, expect, it } from "bun:test";

import { buildProcessFeedbackPrompt } from "./process-feedback.prompt";

describe("buildProcessFeedbackPrompt", () => {
  it("uses paths relative to the mounted workspace root", () => {
    const prompt = buildProcessFeedbackPrompt({
      autorSlug: "disble",
      category: "estilo",
      context: "Párrafo completo con Texto original.",
      anchor: "Texto original",
      suggestedText: "Texto sugerido",
      justification: "Justificacion breve",
      action: "reject",
      severity: "medium",
      suggestionType: "track-change",
      comment: "Prefiero esta construccion.",
    });

    expect(prompt).toContain("Perfil del autor: autores/disble.md");
    expect(prompt).toContain(
      "Skill de referencia: skills/feedback-autor/SKILL.md",
    );
    expect(prompt).toContain("No antepongas `workspace/`");
    expect(prompt).toContain("PATCH CONSERVADOR");
    expect(prompt).toContain("NO escribas");
    expect(prompt).not.toContain("workspace/autores/");
    expect(prompt).not.toContain("workspace/skills/");
  });
});
