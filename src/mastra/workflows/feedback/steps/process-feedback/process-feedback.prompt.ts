/**
 * Builds the workspace-relative prompt used by the feedback workflow step.
 */
import type { ProcessFeedbackPromptInput } from "./process-feedback.types";

/**
 * Builds the feedback-processing prompt using paths relative to the mounted
 * Mastra workspace root.
 */
export function buildProcessFeedbackPrompt(input: ProcessFeedbackPromptInput) {
  const autorProfilePath = `autores/${input.autorSlug}.md`;

  return `<workspace>
Las rutas de este prompt son relativas a la raiz ya montada del workspace.
No antepongas \`workspace/\` ni crees una carpeta \`workspace\` dentro del workspace actual.
</workspace>

<contrato>
Procesá UN comentario de feedback del autor sobre una corrección.
Usá el perfil del autor indicado en este prompt como documento objetivo.
Ejecutá el protocolo completo: RAZONAR -> DECIDIR -> ACTUAR.
Aplicá estrictamente la política de escritura segura de tu protocolo canónico.
Este prompt solo aporta perfil y payload; la sección objetivo, reglas de edición, borrado y aborto están en tu protocolo.
</contrato>

<perfil>
Perfil del autor: ${autorProfilePath}

Perfil actual:
~~~markdown
${input.authorProfile}
~~~
</perfil>

<payload>
${JSON.stringify(input, null, 2)}
</payload>

<respuesta-final>
Confirmá si actualizaste el perfil o descartaste el feedback, con la razón.
</respuesta-final>`;
}
