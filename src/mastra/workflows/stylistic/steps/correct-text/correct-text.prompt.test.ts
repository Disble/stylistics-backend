/**
 * Verifies that the correction prompt embeds author context directly instead of
 * delegating profile reads to the agent.
 */
import { describe, expect, it } from "bun:test";

import type { StylisticWorkflowInput } from "../load-author-profile/load-author-profile.types";
import { buildPrompt } from "./correct-text.prompt";
import type { StylisticWorkflowOutput } from "./correct-text.types";

/** Canonical prompt input reused across prompt-focused tests. */
const baseInput: StylisticWorkflowInput = {
  documentUuid: "44444444-4444-4444-8444-444444444444",
  genero: "narrativa-literaria",
  text: "Era tarde y la casa seguia despierta.",
};

const previousCorrection: StylisticWorkflowOutput = {
  suggestions: [
    {
      type: "track-change",
      context: "Era tarde y la casa seguia despierta.",
      anchor: "seguia",
      suggestedText: "seguía",
      justification:
        "Preferencia explícita del usuario por tildación correcta.",
      category: "ortografia",
      severity: "high",
    },
  ],
  cleanPatterns: ["sin-abuso-de-comas"],
};

describe("buildPrompt", () => {
  it("embeds the provided author profile instead of asking the agent to read files", () => {
    const prompt = buildPrompt(
      baseInput,
      "## CRITERIOS DE INTERVENCIÓN\n- Prefiere frases cortas en escenas tensas.",
    );

    expect(prompt).toContain("<perfil-autor>");
    expect(prompt).toContain("<contrato>");
    expect(prompt).toContain("</contrato>");
    expect(prompt).toContain("<genero>");
    expect(prompt).toContain("</genero>");
    expect(prompt).toContain("<texto-corregir>");
    expect(prompt).toContain("</texto-corregir>");
    expect(prompt).toContain("<respuesta-final>");
    expect(prompt).toContain("</respuesta-final>");
    expect(prompt).toContain("Prefiere frases cortas en escenas tensas.");
    expect(prompt).toContain("contexto de maxima prioridad");
    expect(prompt).not.toContain("<correcion-previa>");
    expect(prompt).toContain(
      "NO uses herramientas para leer archivos en esta tarea",
    );
    expect(prompt).not.toContain("Lee el perfil en autores/");
  });

  it("states explicitly when no prior profile exists", () => {
    const prompt = buildPrompt(baseInput);

    expect(prompt).toContain("No hay perfil previo disponible para este autor");
    expect(prompt).not.toContain("<correcion-previa>");
    expect(prompt).toContain("<perfil-autor>");
    expect(prompt).toContain("</perfil-autor>");
    expect(prompt).toContain(
      "NO uses herramientas para leer archivos en esta tarea",
    );
  });

  it("does not duplicate the canonical category taxonomy from the agent", () => {
    const prompt = buildPrompt(baseInput);

    expect(prompt).toContain(
      "categorías canónicas definidas en tus instrucciones de agente",
    );
    expect(prompt).not.toContain("## CATEGORÍAS CANÓNICAS");
  });

  it("documents delete-only and typography track-change transports accepted by the frontend", () => {
    const prompt = buildPrompt(baseInput);

    expect(prompt).toContain('suggestedText": ""');
    expect(prompt).toContain('suggestedText": "*post mortem*"');
    expect(prompt).toContain('suggestedText": "**PRIME**"');
    expect(prompt).toContain(
      'Si quieres borrar el `anchor`, usa `track-change` con `suggestedText: ""`',
    );
    expect(prompt).toContain("### Errores prohibidos");
    expect(prompt).toContain(
      "texto dentro del markdown debe coincidir exactamente",
    );
    expect(prompt).not.toContain("Ejemplo invalido");
  });

  it("injects a conditional <correcion-previa> block when a previous correction exists", () => {
    const prompt = buildPrompt(baseInput, null, previousCorrection);

    expect(prompt).toContain("<correcion-previa>");
    expect(prompt).toContain(
      "Considera este material como insumo editorial enfocado en preferencias explícitas del usuario",
    );
    expect(prompt).toContain('"anchor": "seguia"');
    expect(prompt).toContain("<clean-patterns>");
    expect(prompt).toContain(
      "intégralas solo cuando mejoren la corrección final",
    );
    expect(prompt).toContain("</correcion-previa>");
  });
});
