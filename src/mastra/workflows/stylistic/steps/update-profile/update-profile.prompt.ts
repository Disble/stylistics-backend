/**
 * Builds the prompt used to persist author-profile changes after a correction
 * run completes.
 */
import type { StylisticCorrectionStepOutput } from "../correct-text/correct-text.types";

export const AUTHOR_PROFILE_OBSERVATIONS_CHARACTER_COUNT_MIN = 4_500;
export const AUTHOR_PROFILE_OBSERVATIONS_CHARACTER_COUNT_MAX = 6_500;

function buildObservationsCharacterCountInstructions(
  observationsCharacterCount: number,
) {
  const metricsLine =
    `Conteo determinístico de ## OBSERVACIONES: ${observationsCharacterCount} caracteres ` +
    `(min=${AUTHOR_PROFILE_OBSERVATIONS_CHARACTER_COUNT_MIN}, max=${AUTHOR_PROFILE_OBSERVATIONS_CHARACTER_COUNT_MAX}).\n`;

  if (
    observationsCharacterCount > AUTHOR_PROFILE_OBSERVATIONS_CHARACTER_COUNT_MAX
  ) {
    return (
      metricsLine +
      `ESTADO: ZONA ROJA. Activá explícitamente el ciclo SÍNTESIS/REFLEXIÓN.\n` +
      `- Ejecutá OBSERVAR → TRANSICIONAR → PODAR sobre ## OBSERVACIONES.\n` +
      `- Además, actualizá ## SÍNTESIS DE OBSERVACIONES como capa compacta derivada de las observaciones persistidas.\n` +
      `- La síntesis NO es resumen narrativo del autor: debe ser memoria operativa compacta para futuras correcciones.\n` +
      `- Compactá familias redundantes dentro de ## OBSERVACIONES cuando haya duplicación semántica clara.\n` +
      `- Conservá criterios de intervención y conocimiento vigente; eliminá solo redundancia, obsolescencia o patrones en 🟢 autorizados por la skill.\n`
    );
  }

  if (
    observationsCharacterCount >=
    AUTHOR_PROFILE_OBSERVATIONS_CHARACTER_COUNT_MIN
  ) {
    return (
      metricsLine +
      `ESTADO: ZONA AMARILLA. No actives SÍNTESIS/REFLEXIÓN todavía.\n` +
      `- Ejecutá solo OBSERVAR → TRANSICIONAR → PODAR.\n` +
      `- No modifiques ## SÍNTESIS DE OBSERVACIONES.\n` +
      `- Aplicá presión estricta contra duplicados: si una evidencia encaja en una familia existente, actualizá esa viñeta en lugar de crear otra.\n`
    );
  }

  return (
    metricsLine +
    `ESTADO: ZONA VERDE. Ejecutá actualización normal.\n` +
    `- Ejecutá solo OBSERVAR → TRANSICIONAR → PODAR.\n` +
    `- No modifiques ## SÍNTESIS DE OBSERVACIONES salvo instrucción explícita posterior.\n`
  );
}

/**
 * Builds the profile-update prompt from the latest correction payload.
 */
export function buildUpdateProfilePrompt(input: StylisticCorrectionStepOutput) {
  const autorProfilePath = `autores/${input.autorSlug}.md`;
  const observationsCharacterCountInstructions =
    buildObservationsCharacterCountInstructions(
      input.authorProfileObservationsCharacterCount,
    );

  return (
    `Las rutas de este prompt son relativas a la raiz ya montada del workspace. ` +
    `No antepongas \`workspace/\` ni crees una carpeta \`workspace\` dentro del workspace actual.\n\n` +
    `Actualizá el perfil del autor "${input.autorSlug}".\n\n` +
    `Perfil del autor: ${autorProfilePath}\n` +
    `Skill de referencia: skills/perfil-autor/SKILL.md\n\n` +
    `Perfil actual:\n` +
    `~~~markdown\n${input.authorProfile}\n~~~\n\n` +
    `${observationsCharacterCountInstructions}\n` +
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
