/**
 * Verifies that the correction prompt embeds author context directly instead of
 * delegating profile reads to the agent.
 */
import { describe, expect, it } from "bun:test";

import type { StylisticWorkflowInput } from "../load-author-profile/load-author-profile.types";
import { buildPrompt } from "./correct-text.prompt";

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
    expect(prompt).toContain("<focos-usuario>");
    expect(prompt).toContain(
      "No hay instrucciones globales de corrección para este usuario",
    );
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

  it("turns user correction instructions into an active audit checklist", () => {
    const prompt = buildPrompt(
      baseInput,
      null,
      "Vigila abuso de puntos suspensivos, comas, listas y ecos léxicos.",
    );

    expect(prompt).toContain("<focos-usuario>");
    expect(prompt).toContain("orientan la auditoría de ESTE texto");
    expect(prompt).toContain(
      "Vigila abuso de puntos suspensivos, comas, listas y ecos léxicos.",
    );
    expect(prompt).toContain(
      "Convierte las instrucciones del usuario en criterios operativos verificables",
    );
    expect(prompt).toContain(
      "error local, patrón recurrente, desviación de registro",
    );
    expect(prompt).toContain(
      "Evalúa concentración, cercanía, recurrencia, función expresiva",
    );
    expect(prompt).toContain(
      "nombra el criterio de usuario aplicado y la evidencia textual",
    );
    expect(prompt).toContain("Escalera de decisión");
    expect(prompt).toContain(
      "trátalo como restricción operativa: no propongas cambios fuera de ese límite",
    );
    expect(prompt).toContain(
      "ajusta solo el defecto señalado y conserva los rasgos de voz",
    );
    expect(prompt).not.toContain(
      "por ejemplo: puntos suspensivos, comas, listas",
    );
    expect(prompt).not.toContain("No dependas");
    expect(prompt).not.toContain("No marques");
    expect(prompt).not.toContain("no inventes");
    expect(prompt).not.toContain("Casos guía");
  });
});
