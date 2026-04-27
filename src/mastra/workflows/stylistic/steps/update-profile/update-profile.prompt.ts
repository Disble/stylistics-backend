/**
 * Builds the prompt used to persist author-profile changes after a correction
 * run completes.
 */
import type { StylisticCorrectionStepOutput } from "../correct-text/correct-text.types";

export const AUTHOR_PROFILE_CORRECTION_PATTERNS_WORD_COUNT_MIN = 550;
export const AUTHOR_PROFILE_CORRECTION_PATTERNS_WORD_COUNT_MAX = 800;

function buildCorrectionPatternsWordCountInstructions(
  correctionPatternsWordCount: number,
) {
  const metricsLine =
    `Conteo determinístico de ## PATRONES VIVOS: ${correctionPatternsWordCount} palabras ` +
    `(min=${AUTHOR_PROFILE_CORRECTION_PATTERNS_WORD_COUNT_MIN}, max=${AUTHOR_PROFILE_CORRECTION_PATTERNS_WORD_COUNT_MAX}).\n`;

  if (
    correctionPatternsWordCount >
    AUTHOR_PROFILE_CORRECTION_PATTERNS_WORD_COUNT_MAX
  ) {
    return (
      metricsLine +
      `ESTADO: ZONA ROJA. Activá COMPACTACIÓN DEL PERFIL VIVO.\n` +
      `- Ejecutá el modo de compactación definido en la skill de referencia.\n` +
      `- Este prompt solo aporta la activación determinística por tamaño; el alcance concreto de compactación lo define la skill.\n`
    );
  }

  if (
    correctionPatternsWordCount >=
    AUTHOR_PROFILE_CORRECTION_PATTERNS_WORD_COUNT_MIN
  ) {
    return (
      metricsLine +
      `ESTADO: ZONA AMARILLA. No actives compactación completa todavía.\n` +
      `- Ejecutá actualización normal según la skill, con presión estricta contra duplicados.\n`
    );
  }

  return (
    metricsLine +
    `ESTADO: ZONA VERDE. Ejecutá actualización normal.\n` +
    `- Aplicá el protocolo normal definido en la skill de referencia.\n`
  );
}

/**
 * Builds the profile-update prompt from the latest correction payload.
 */
export function buildUpdateProfilePrompt(input: StylisticCorrectionStepOutput) {
  const autorProfilePath = `autores/${input.autorSlug}.md`;
  const correctionPatternsWordCountInstructions =
    buildCorrectionPatternsWordCountInstructions(
      input.authorProfileCorrectionPatternsWordCount,
    );

  return (
    `Las rutas de este prompt son relativas a la raiz ya montada del workspace. ` +
    `No antepongas \`workspace/\` ni crees una carpeta \`workspace\` dentro del workspace actual.\n\n` +
    `Actualizá el perfil del autor "${input.autorSlug}".\n\n` +
    `Perfil del autor: ${autorProfilePath}\n` +
    `Skill de referencia: skills/perfil-autor/SKILL.md\n\n` +
    `Perfil actual:\n` +
    `~~~markdown\n${input.authorProfile}\n~~~\n\n` +
    `${correctionPatternsWordCountInstructions}\n` +
    `Sugerencias de corrección de esta sesión:\n` +
    `${JSON.stringify(input.suggestions, null, 2)}\n\n` +
    `Patrones encontrados limpios (evidencia positiva):\n` +
    `${JSON.stringify(input.cleanPatterns, null, 2)}\n\n` +
    `MODO DE ESCRITURA:\n` +
    `- Aplicá estrictamente la Política de escritura segura definida en skills/perfil-autor/SKILL.md.\n` +
    `- Este prompt solo define el estado determinístico de la ejecución; las reglas de edición, preservación, borrado y aborto están en la skill.\n` +
    `Escribí el perfil actualizado en ${autorProfilePath} usando la herramienta de escritura del workspace solo si podés hacerlo con seguridad.`
  );
}
