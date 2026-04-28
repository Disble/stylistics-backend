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
      `- Ejecutá el modo de compactación definido en tu protocolo canónico.\n` +
      `- Este prompt solo aporta la activación determinística por tamaño; el alcance concreto de compactación lo define tu protocolo.\n`
    );
  }

  if (
    correctionPatternsWordCount >=
    AUTHOR_PROFILE_CORRECTION_PATTERNS_WORD_COUNT_MIN
  ) {
    return (
      metricsLine +
      `ESTADO: ZONA AMARILLA. No actives compactación completa todavía.\n` +
      `- Ejecutá actualización normal según tu protocolo, con presión estricta contra duplicados.\n`
    );
  }

  return (
    metricsLine +
    `ESTADO: ZONA VERDE. Ejecutá actualización normal.\n` +
    `- Aplicá tu protocolo normal.\n`
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

  return `<workspace>
Las rutas de este prompt son relativas a la raiz ya montada del workspace.
No antepongas \`workspace/\` ni crees una carpeta \`workspace\` dentro del workspace actual.
</workspace>

<contrato>
Actualizá el perfil del autor "${input.autorSlug}".
Aplicá estrictamente la Política de escritura segura de tu protocolo canónico.
Este prompt solo define el estado determinístico de la ejecución; las reglas de edición, preservación, borrado y aborto están en tu protocolo.
Escribí el perfil actualizado en ${autorProfilePath} usando la herramienta de escritura del workspace solo si podés hacerlo con seguridad.
</contrato>

<perfil>
Perfil del autor: ${autorProfilePath}

Perfil actual:
~~~markdown
${input.authorProfile}
~~~
</perfil>

<metricas>
${correctionPatternsWordCountInstructions}</metricas>

<datos>
Sugerencias de corrección de esta sesión:
${JSON.stringify(input.suggestions, null, 2)}

Patrones encontrados limpios (evidencia positiva):
${JSON.stringify(input.cleanPatterns, null, 2)}
</datos>

<respuesta-final>
Confirmá de manera resumida qué cambios específicos lograste incorporar al perfil, o explicá por qué descartaste la actualización.
</respuesta-final>`;
}
