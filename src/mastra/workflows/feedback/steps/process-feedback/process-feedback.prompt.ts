/**
 * Builds the prompt used by the feedback workflow step.
 */
import type { ProcessFeedbackPromptInput } from "./process-feedback.types";

/** Builds the DB-backed prompt used when feedback targets a persisted document profile. */
export function buildProcessFeedbackPrompt(input: ProcessFeedbackPromptInput) {
  return `Procesás UN comentario explícito del autor sobre UNA corrección.

Devolvé SOLO el output estructurado solicitado por el caller.
NO menciones tools, archivos, rutas de workspace ni explicaciones extra fuera de la respuesta estructurada.

Contrato:
- Usá el perfil documental persistido provisto como documento objetivo.
- Tratá esto como feedback a nivel documento.
- Actualizá solo \`## CRITERIOS DE INTERVENCIÓN\` cuando el feedback exprese una preferencia reutilizable de intervención, un límite duro, una restricción de voz o una frontera de corrección.
- Ignorá feedback contextual, vago o no reutilizable como criterio documental.
- NO actualices \`## PATRONES VIVOS\` desde este workflow.
- Preservá el contenido no afectado de forma literal cuando sea posible.

Document UUID: ${input.documentUuid}

Markdown actual del perfil documental:
~~~markdown
${input.authorProfile}
~~~

Payload de feedback:
${JSON.stringify(input, null, 2)}

Devolvé un decision summary conciso explicando si el perfil fue actualizado o ignorado.`;
}
