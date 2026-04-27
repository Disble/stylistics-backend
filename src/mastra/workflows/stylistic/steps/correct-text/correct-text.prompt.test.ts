/**
 * Verifies that the correction prompt embeds author context directly instead of
 * delegating profile reads to the agent.
 */
import { describe, expect, it } from "bun:test";

import type { StylisticWorkflowInput } from "../load-author-profile/load-author-profile.types";
import { buildPrompt } from "./correct-text.prompt";

/** Canonical prompt input reused across prompt-focused tests. */
const baseInput: StylisticWorkflowInput = {
  autorSlug: "disble",
  genero: "narrativa-literaria",
  text: "Era tarde y la casa seguia despierta.",
};

describe("buildPrompt", () => {
  it("embeds the provided author profile instead of asking the agent to read files", () => {
    const prompt = buildPrompt(
      baseInput,
      "## CRITERIOS DE INTERVENCIÓN\n- Prefiere frases cortas en escenas tensas.",
    );

    expect(prompt).toContain("## PERFIL DEL AUTOR");
    expect(prompt).toContain("Prefiere frases cortas en escenas tensas.");
    expect(prompt).toContain(
      "NO uses herramientas para leer archivos en esta tarea",
    );
    expect(prompt).not.toContain("Lee el perfil en autores/");
  });

  it("states explicitly when no prior profile exists", () => {
    const prompt = buildPrompt(baseInput);

    expect(prompt).toContain("No hay perfil previo disponible para este autor");
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
});
