import { describe, expect, it } from "bun:test";

import {
  AUTHOR_PROFILE_CORRECTION_PATTERNS_WORD_COUNT_MAX,
  AUTHOR_PROFILE_CORRECTION_PATTERNS_WORD_COUNT_MIN,
  buildUpdateProfilePrompt,
} from "./update-profile.prompt";

function createPromptInput(authorProfileCorrectionPatternsWordCount: number) {
  return {
    autorSlug: "disble",
    authorProfile: [
      "# Perfil de Corrección: Disble",
      "",
      "## PATRONES VIVOS",
      "### Gramática",
      "- 🔴 Concordancia: mantiene desajustes de número.",
      "",
      "## CRITERIOS DE INTERVENCIÓN",
      "- No corregir un rasgo declarado.",
    ].join("\n"),
    authorProfileCorrectionPatternsWordCount,
    suggestions: [
      {
        type: "comment-only" as const,
        context: "Texto con problema.",
        anchor: "problema",
        justification: "Comentario editorial.",
        category: "estilo" as const,
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
    expect(prompt).toContain("## PATRONES VIVOS");
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
      createPromptInput(AUTHOR_PROFILE_CORRECTION_PATTERNS_WORD_COUNT_MIN - 1),
    );

    expect(prompt).toContain("ESTADO: ZONA VERDE");
    expect(prompt).toContain(
      "Aplicá el protocolo normal definido en la skill de referencia",
    );
    expect(prompt).not.toContain("Activá COMPACTACIÓN");
  });

  it("tightens duplicate pressure between minimum and maximum thresholds", () => {
    const prompt = buildUpdateProfilePrompt(
      createPromptInput(AUTHOR_PROFILE_CORRECTION_PATTERNS_WORD_COUNT_MIN),
    );

    expect(prompt).toContain("ESTADO: ZONA AMARILLA");
    expect(prompt).toContain("No actives compactación completa todavía");
    expect(prompt).toContain("presión estricta contra duplicados");
  });

  it("activates compaction when living patterns exceed the maximum threshold", () => {
    const prompt = buildUpdateProfilePrompt(
      createPromptInput(AUTHOR_PROFILE_CORRECTION_PATTERNS_WORD_COUNT_MAX + 1),
    );

    expect(prompt).toContain("ESTADO: ZONA ROJA");
    expect(prompt).toContain("Activá COMPACTACIÓN DEL PERFIL VIVO");
    expect(prompt).toContain("modo de compactación definido en la skill");
    expect(prompt).not.toContain("No crees SÍNTESIS, REFLEXIONES");
  });
});
