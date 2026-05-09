/**
 * Verifies that the correction prompt embeds author context directly instead of
 * delegating profile reads to the agent.
 */
import { describe, expect, it } from "bun:test";

import type { StylisticWorkflowInput } from "../load-author-profile/load-author-profile.types";
import {
  buildCorrectionInstructionsSystemMessage,
  buildPrompt,
} from "./correct-text.prompt";

/** Canonical prompt input reused across prompt-focused tests. */
const baseInput: StylisticWorkflowInput = {
  documentUuid: "44444444-4444-4444-8444-444444444444",
  genero: "narrativa-literaria",
  text: "Era tarde y la casa seguia despierta.",
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
    expect(prompt).toContain("contexto del documento");
    expect(prompt).toContain("preservar la voz autoral");
    expect(prompt).toContain(
      "NO uses herramientas para leer archivos en esta tarea",
    );
    expect(prompt).not.toContain("Lee el perfil en autores/");
  });

  it("states explicitly when no prior profile exists", () => {
    const prompt = buildPrompt(baseInput);

    expect(prompt).toContain("No hay perfil previo disponible para este autor");
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
      'Si queres borrar el `anchor`, usa `track-change` con `suggestedText: ""`',
    );
    expect(prompt).toContain("### Errores prohibidos");
    expect(prompt).toContain(
      "texto dentro del markdown debe coincidir exactamente",
    );
    expect(prompt).not.toContain("Ejemplo invalido");
  });
});

describe("buildCorrectionInstructionsSystemMessage", () => {
  it("omits the system message when instructions are empty", () => {
    expect(buildCorrectionInstructionsSystemMessage(null)).toBeUndefined();
    expect(buildCorrectionInstructionsSystemMessage("   ")).toBeUndefined();
  });

  it("wraps user correction instructions in the agreed correction scope", () => {
    const systemMessage = buildCorrectionInstructionsSystemMessage(
      "Vigilá subordinadas demasiado largas.",
    );

    expect(systemMessage).toContain("<instrucciones-globales-correccion>");
    expect(systemMessage).toContain(
      "Estas instrucciones complementan el perfil del documento",
    );
    expect(systemMessage).toContain(
      "priorizá estas instrucciones sin destruir la voz autoral documentada",
    );
    expect(systemMessage).toContain(
      "No reemplazan el perfil, no lo actualizan",
    );
    expect(systemMessage).toContain("Vigilá subordinadas demasiado largas.");
    expect(systemMessage).not.toContain("documental local");
    expect(systemMessage).not.toContain("sigue siendo");
    expect(systemMessage).not.toContain("maxima prioridad");
  });
});
