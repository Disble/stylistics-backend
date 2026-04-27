import { describe, expect, it } from "bun:test";

import {
  AUTHOR_PROFILE_OBSERVATIONS_CHARACTER_COUNT_MAX,
  AUTHOR_PROFILE_OBSERVATIONS_CHARACTER_COUNT_MIN,
  buildUpdateProfilePrompt,
} from "./update-profile.prompt";

function createPromptInput(authorProfileObservationsCharacterCount: number) {
  return {
    autorSlug: "disble",
    authorProfile: [
      "# Perfil de Corrección: Disble",
      "",
      "## SÍNTESIS DE OBSERVACIONES",
      "- Memoria compacta vigente.",
      "",
      "## OBSERVACIONES",
      "### Lengua",
      "- 🔴 Concordancia: mantiene desajustes de número.",
    ].join("\n"),
    authorProfileObservationsCharacterCount,
    suggestions: [
      {
        type: "comment-only" as const,
        context: "Texto con problema.",
        anchor: "problema",
        justification: "Comentario editorial.",
        category: "estilo",
        severity: "medium" as const,
      },
    ],
    cleanPatterns: ["uso-correcto-del-subjuntivo"],
  };
}

describe("buildUpdateProfilePrompt", () => {
  it("delegates safe writing policy to the author-profile skill", () => {
    const prompt = buildUpdateProfilePrompt(createPromptInput(1_000));

    expect(prompt).toContain("Perfil del autor: autores/disble.md");
    expect(prompt).toContain(
      "Skill de referencia: skills/perfil-autor/SKILL.md",
    );
    expect(prompt).toContain("Perfil actual:");
    expect(prompt).toContain("## SÍNTESIS DE OBSERVACIONES");
    expect(prompt).toContain(
      "Política de escritura segura definida en skills/perfil-autor/SKILL.md",
    );
    expect(prompt).toContain(
      "las reglas de edición, preservación, borrado y aborto están en la skill",
    );
    expect(prompt).not.toContain("PATCH CONSERVADOR");
    expect(prompt).not.toContain("NO escribas");
    expect(prompt).not.toContain("workspace/autores/");
    expect(prompt).not.toContain("workspace/skills/");
  });

  it("keeps normal observation update below the minimum threshold", () => {
    const prompt = buildUpdateProfilePrompt(
      createPromptInput(AUTHOR_PROFILE_OBSERVATIONS_CHARACTER_COUNT_MIN - 1),
    );

    expect(prompt).toContain("ESTADO: ZONA VERDE");
    expect(prompt).toContain("Ejecutá solo OBSERVAR → TRANSICIONAR → PODAR");
    expect(prompt).not.toContain("Activá explícitamente el ciclo");
  });

  it("tightens duplicate pressure between minimum and maximum thresholds", () => {
    const prompt = buildUpdateProfilePrompt(
      createPromptInput(AUTHOR_PROFILE_OBSERVATIONS_CHARACTER_COUNT_MIN),
    );

    expect(prompt).toContain("ESTADO: ZONA AMARILLA");
    expect(prompt).toContain("No actives SÍNTESIS/REFLEXIÓN todavía");
    expect(prompt).toContain("presión estricta contra duplicados");
  });

  it("activates synthesis when observations exceed the maximum threshold", () => {
    const prompt = buildUpdateProfilePrompt(
      createPromptInput(AUTHOR_PROFILE_OBSERVATIONS_CHARACTER_COUNT_MAX + 1),
    );

    expect(prompt).toContain("ESTADO: ZONA ROJA");
    expect(prompt).toContain(
      "Activá explícitamente el ciclo SÍNTESIS/REFLEXIÓN",
    );
    expect(prompt).toContain(
      "actualizá ## SÍNTESIS DE OBSERVACIONES como capa compacta",
    );
    expect(prompt).toContain("Compactá familias redundantes");
  });
});
