import type { ApplyDocumentFeedbackInput } from "./apply-document-feedback.types";

/** Builds the prompt used to apply one feedback event to a document profile. */
export function buildApplyDocumentFeedbackPrompt(
  input: ApplyDocumentFeedbackInput,
): string {
  return `<contract>
Procesá UN comentario de feedback del autor sobre una corrección.
Usá el perfil documental provisto en este prompt como documento objetivo.
Ejecutá el protocolo completo: RAZONAR -> DECIDIR -> ACTUAR.
Aplicá estrictamente la política de escritura segura de tu protocolo canónico.
Este prompt solo aporta perfil y payload; la sección objetivo, reglas de edición, política de borrado y criterios de aborto viven en tu protocolo canónico.
No inventes rutas, no menciones workspace y devolvé SOLO el output estructurado solicitado por el caller.
Preservá intacta la estructura canónica completa de \`## PATRONES VIVOS\`, incluyendo \`### Ortografía\`, \`### Gramática\`, \`### Puntuación\`, \`### Tipografía\`, \`### Léxico\` y \`### Estilo\`.
</contract>

<profile>
Perfil documental actual:
~~~markdown
${input.currentProfileMarkdown}
~~~
</profile>

<payload>
${JSON.stringify(
  {
    category: input.category,
    context: input.context,
    anchor: input.anchor,
    suggestedText: input.suggestedText,
    justification: input.justification,
    action: input.action,
    severity: input.severity,
    suggestionType: input.suggestionType,
    comment: input.comment,
  },
  null,
  2,
)}
</payload>

<final-response>
Si devolvés status \`updated\`, DEBÉS devolver también el perfil markdown completo actualizado.
Si devolvés status \`ignored\`, explicá la categoría asignada y la razón del descarte en un decision summary conciso.
</final-response>`;
}
