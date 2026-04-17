import { describe, expect, it } from "bun:test";

import { buildUpdateProfilePrompt } from "./update-profile.prompt";

describe("buildUpdateProfilePrompt", () => {
  it("forces conservative patching instead of rewrite-by-omission", () => {
    const prompt = buildUpdateProfilePrompt({
      autorSlug: "disble",
      suggestions: [
        {
          type: "comment-only",
          context: "Texto con problema.",
          anchor: "problema",
          justification: "Comentario editorial.",
          category: "estilo",
          severity: "medium",
        },
      ],
      cleanPatterns: ["uso-correcto-del-subjuntivo"],
    });

    expect(prompt).toContain("Perfil del autor: autores/disble.md");
    expect(prompt).toContain("Skill de referencia: skills/perfil-autor/SKILL.md");
    expect(prompt).toContain("PATCH CONSERVADOR");
    expect(prompt).toContain("Reemplazá solo el bloque entre ## REFLEXIONES y ## OBSERVACIONES");
    expect(prompt).toContain("NO escribas");
    expect(prompt).not.toContain("workspace/autores/");
    expect(prompt).not.toContain("workspace/skills/");
  });
});
