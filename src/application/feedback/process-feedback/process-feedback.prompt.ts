import type { ProcessFeedbackPromptInput } from "./process-feedback.types";

/**
 * Builds the feedback-processing prompt using paths relative to the mounted
 * Mastra workspace root.
 */
export function buildProcessFeedbackPrompt(input: ProcessFeedbackPromptInput) {
  const autorProfilePath = `autores/${input.autorSlug}.md`;
  const skillPath = "skills/feedback-autor/SKILL.md";

  return (
    "Las rutas de este prompt son relativas a la raiz ya montada del workspace. " +
    "No antepongas `workspace/` ni crees una carpeta `workspace` dentro del workspace actual.\n\n" +
    "RUTAS EXACTAS (usar tal cual, sin modificar):\n" +
    `- Perfil del autor: ${autorProfilePath}\n` +
    `- Skill de referencia: ${skillPath}\n\n` +
    "Procesa el siguiente feedback del autor sobre una correccion.\n\n" +
    "Payload de feedback:\n" +
    `${JSON.stringify(input, null, 2)}\n\n` +
    "Ejecuta el protocolo completo: LEER -> RAZONAR -> DECIDIR -> ACTUAR.\n" +
    "Confirma al final si actualizaste el perfil o descartaste el feedback, con la razon."
  );
}
