import type { StylisticCorrectionStepOutput } from "../correct-text/correct-text.types";

/**
 * Builds the profile-update prompt from the latest correction payload.
 */
export function buildUpdateProfilePrompt(input: StylisticCorrectionStepOutput) {
  const autorProfilePath = `workspace/autores/${input.autorSlug}.md`;

  return (
    `Actualizá el perfil del autor "${input.autorSlug}".\n\n` +
    `Perfil del autor: ${autorProfilePath}\n` +
    `Skill de referencia: workspace/skills/perfil-autor/SKILL.md\n\n` +
    `Sugerencias de corrección de esta sesión:\n` +
    `${JSON.stringify(input.suggestions, null, 2)}\n\n` +
    `Patrones encontrados limpios (evidencia positiva):\n` +
    `${JSON.stringify(input.cleanPatterns, null, 2)}\n\n` +
    `Ejecutá las 4 fases: OBSERVAR → TRANSICIONAR → PODAR → REFLEJAR.\n` +
    `Escribí el perfil actualizado en ${autorProfilePath} usando la herramienta de escritura del workspace.`
  );
}
