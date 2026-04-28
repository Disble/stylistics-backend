/**
 * Verifies that the feedback prompt keeps all workspace paths relative and
 * inlines the author profile content.
 */
import { describe, expect, it } from "bun:test";

import { buildProcessFeedbackPrompt } from "./process-feedback.prompt";

describe("buildProcessFeedbackPrompt", () => {
  it("inlines the author profile and uses paths relative to the mounted workspace root", () => {
    const prompt = buildProcessFeedbackPrompt({
      autorSlug: "disble",
      authorProfile:
        "# Perfil de Corrección: Disble\n\n## PATRONES VIVOS\n\n## CRITERIOS DE INTERVENCIÓN",
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
    expect(prompt).toContain("Perfil actual:");
    expect(prompt).toContain("# Perfil de Corrección: Disble");
    expect(prompt).toContain("<workspace>");
    expect(prompt).toContain("</workspace>");
    expect(prompt).toContain("<contrato>");
    expect(prompt).toContain("</contrato>");
    expect(prompt).toContain("<perfil>");
    expect(prompt).toContain("</perfil>");
    expect(prompt).toContain("<payload>");
    expect(prompt).toContain("</payload>");
    expect(prompt).toContain("<respuesta-final>");
    expect(prompt).toContain("</respuesta-final>");
    expect(prompt).not.toContain("skills/feedback-autor/SKILL.md");
    expect(prompt).toContain("No antepongas `workspace/`");
    expect(prompt).toContain(
      "política de escritura segura de tu protocolo canónico",
    );
    expect(prompt).toContain(
      "la sección objetivo, reglas de edición, borrado y aborto están en tu protocolo",
    );
    expect(prompt).not.toContain("PATCH CONSERVADOR");
    expect(prompt).not.toContain("workspace/autores/");
    expect(prompt).not.toContain("workspace/skills/");
  });
});
