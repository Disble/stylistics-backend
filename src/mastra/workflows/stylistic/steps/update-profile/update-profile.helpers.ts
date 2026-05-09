import type { UpdateDocumentStyleProfileInput } from "./update-profile.types";

const PROFILE_WORD_COUNT_MIN = 550;
const PROFILE_WORD_COUNT_MAX = 800;

function buildWordCountInstructions(
  correctionPatternsWordCount: number,
): string {
  const metricsLine =
    `Conteo determinístico de palabras para ## PATRONES VIVOS: ${correctionPatternsWordCount} palabras ` +
    `(min=${PROFILE_WORD_COUNT_MIN}, max=${PROFILE_WORD_COUNT_MAX}).\n`;

  if (correctionPatternsWordCount > PROFILE_WORD_COUNT_MAX) {
    return (
      metricsLine +
      "ESTADO: ZONA ROJA. Compactá el perfil vivo.\n" +
      "- Fusioná patrones semánticamente duplicados dentro de la categoría canónica.\n" +
      "- Conservá los criterios de intervención intactos salvo que la evidencia actual exija directamente un cambio.\n"
    );
  }

  if (correctionPatternsWordCount >= PROFILE_WORD_COUNT_MIN) {
    return (
      metricsLine +
      "ESTADO: ZONA AMARILLA. Aplicá una actualización normal con presión estricta contra duplicados.\n"
    );
  }

  return metricsLine + "ESTADO: ZONA VERDE. Aplicá una actualización normal.\n";
}

/** Builds the prompt used by the update-profile step. */
export function buildUpdateProfilePrompt(
  input: UpdateDocumentStyleProfileInput,
): string {
  const wordCountInstructions = buildWordCountInstructions(
    input.correctionPatternsWordCount,
  );

  return `<contrato>
Actualizá el perfil documental persistido con id \`${input.documentStyleProfileId}\`.
Aplicá estrictamente la Política de escritura segura de tu protocolo canónico.
Este prompt solo define el estado determinístico de la ejecución; las reglas de edición, preservación, borrado, transición y aborto viven en tu protocolo.
Tratá el markdown provisto como documento objetivo. No inventes rutas, no menciones workspace y no devuelvas prosa libre fuera del output estructurado.
Preservá la estructura canónica completa de \`## PATRONES VIVOS\`: \`### Ortografía\`, \`### Gramática\`, \`### Puntuación\`, \`### Tipografía\`, \`### Léxico\`, \`### Estilo\`, aunque alguna subsección no tenga viñetas todavía.
</contrato>

<perfil>
Perfil documental actual:
~~~markdown
${input.currentProfileMarkdown}
~~~
</perfil>

<metricas>
${wordCountInstructions}</metricas>

<datos>
Sugerencias de corrección de esta sesión:
${JSON.stringify(input.suggestions, null, 2)}

Patrones encontrados limpios (evidencia positiva):
${JSON.stringify(input.cleanPatterns, null, 2)}
</datos>

<respuesta-final>
Devolvé el documento markdown completo actualizado y un change summary breve indicando agregados, podas o transiciones logradas, o explicá por qué descartaste cambios si no corresponde actualizar.
</respuesta-final>`;
}
