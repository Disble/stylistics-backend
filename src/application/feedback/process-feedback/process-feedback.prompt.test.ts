import { describe, expect, it } from "bun:test";

import { buildProcessFeedbackPrompt } from "./process-feedback.prompt";

describe("buildProcessFeedbackPrompt", () => {
  it("uses paths relative to the mounted workspace root", () => {
    const prompt = buildProcessFeedbackPrompt({
      autorSlug: "disble",
      category: "estilo",
      originalText: "Texto original",
      suggestedText: "Texto sugerido",
      justification: "Justificacion breve",
      rating: "negative",
      severity: "medium",
      comment: "Prefiero esta construccion.",
    });

    expect(prompt).toContain("Perfil del autor: autores/disble.md");
    expect(prompt).toContain(
      "Skill de referencia: skills/feedback-autor/SKILL.md",
    );
    expect(prompt).toContain("No antepongas `workspace/`");
    expect(prompt).not.toContain("workspace/autores/");
    expect(prompt).not.toContain("workspace/skills/");
  });
});
