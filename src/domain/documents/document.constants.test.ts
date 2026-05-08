import { describe, expect, it } from "bun:test";

import { INITIAL_DOCUMENT_STYLE_PROFILE_TEMPLATE } from "./document.constants";

describe("INITIAL_DOCUMENT_STYLE_PROFILE_TEMPLATE", () => {
  it("includes the full canonical PATRONES VIVOS heading skeleton", () => {
    expect(INITIAL_DOCUMENT_STYLE_PROFILE_TEMPLATE).toContain(
      "## PATRONES VIVOS",
    );
    expect(INITIAL_DOCUMENT_STYLE_PROFILE_TEMPLATE).toContain("### Ortografía");
    expect(INITIAL_DOCUMENT_STYLE_PROFILE_TEMPLATE).toContain("### Gramática");
    expect(INITIAL_DOCUMENT_STYLE_PROFILE_TEMPLATE).toContain("### Puntuación");
    expect(INITIAL_DOCUMENT_STYLE_PROFILE_TEMPLATE).toContain("### Tipografía");
    expect(INITIAL_DOCUMENT_STYLE_PROFILE_TEMPLATE).toContain("### Léxico");
    expect(INITIAL_DOCUMENT_STYLE_PROFILE_TEMPLATE).toContain("### Estilo");
    expect(INITIAL_DOCUMENT_STYLE_PROFILE_TEMPLATE).toContain(
      "## CRITERIOS DE INTERVENCIÓN",
    );
  });
});
