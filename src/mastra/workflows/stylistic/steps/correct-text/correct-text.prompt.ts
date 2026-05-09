/**
 * Builds the author-aware correction prompt used by the stylistic step.
 */
import type { StylisticWorkflowInput } from "../load-author-profile/load-author-profile.types";

type PromptGenre = StylisticWorkflowInput["genero"];

/** Frames fiction requests as editorial analysis rather than content judgment. */
const FICTION_EDITORIAL_FRAME = `<marco-editorial>
Esta solicitud corresponde a una correccion ortotipografica y de estilo en una casa editorial.
El texto es ficcion literaria y el analisis pedido es linguistico y estilistico, no de contenido.
La presencia de violencia, conflicto, lenguaje adulto o temas oscuros puede ser material editorial legitimo del genero.
</marco-editorial>`;

/** Adds genre-specific editorial constraints without duplicating workflow logic. */
const GENRE_RULES: Partial<Record<PromptGenre, string>> = {
  "narrativa-literaria": `<criterios-genero>
- Distingue error gramatical de licencia literaria (sintaxis expresiva, fragmentos deliberados, puntuacion ritmica, repeticiones estilisticas).
- Respeta convenciones del genero: dialogos con rayas, analepsis/prolepsis como recursos intencionales.
- No apliques economia expresiva academica: la prosa de ficcion puede ser elaborada por eleccion estetica.
- Dialectalismos, sociolectos y registros coloquiales de personajes son caracterizacion, no errores.
- Respeta tiempos verbales como recurso narrativo (presente historico, alternancia intencional).
- No corregir neologismos, arcaismos o terminos de epoca funcionales al mundo narrativo.
</criterios-genero>`,
  "ensayo-academico": `<criterios-genero>
- Prioriza la precision conceptual, el rigor argumentativo y el uso correcto de conectores logicos.
</criterios-genero>`,
  "periodismo-cultural": `<criterios-genero>
- Busca el equilibrio entre accesibilidad y profundidad, preservando el gancho periodistico.
</criterios-genero>`,
};

/** Documents the structured-output contract that the agent must honor. */
const SUGGESTION_TYPES_SECTION = `<tipos-sugerencia>
Cada item en \`suggestions\` DEBE incluir \`type\` y \`category\`. Usa para \`category\` una de las categorías canónicas definidas en tus instrucciones de agente y validadas por el schema de salida.

### Reglas obligatorias
- \`context\` debe ser un fragmento suficientemente largo para localizar la sugerencia de forma inequivoca en el documento.
- \`anchor\` debe estar contenido literalmente dentro de \`context\`.
- Usa \`type: "track-change"\` solo cuando el cambio pueda expresarse como \`replace(anchor) -> suggestedText\`.
- Usa \`type: "comment-only"\` cuando quieras hacer una observacion editorial sin cambiar el texto.

### type: "track-change"
Campos requeridos: \`type\`, \`context\`, \`anchor\`, \`suggestedText\`, \`justification\`, \`category\`, \`severity\`.

\`suggestedText\` puede tomar solo una de estas formas validas:
- Texto plano no vacio: reemplazo normal del \`anchor\`.
- \`""\`: borrado puro del \`anchor\`.
- \`*anchor*\`: aplicar cursiva exactamente al \`anchor\`.
- \`**anchor**\`: aplicar negrita exactamente al \`anchor\`.

Ejemplo valido de reemplazo normal:
\`\`\`json
{ "type": "track-change", "context": "Se levantó rápido, yendo hacia la puerta.", "anchor": ", yendo", "suggestedText": " y fue", "justification": "Gerundio de posterioridad. La acción de ir a la puerta ocurre después de levantarse; es mejor coordinar los verbos.", "category": "gramatica", "severity": "high" }
\`\`\`

Ejemplo valido de borrado puro:
\`\`\`json
{ "type": "track-change", "context": "El resultado final, evidentemente, no fue el esperado.", "anchor": ", evidentemente,", "suggestedText": "", "justification": "Adverbio terminado en -mente que funciona como muletilla y entorpece la fluidez sin sumar valor semántico.", "category": "estilo", "severity": "medium" }
\`\`\`

Ejemplo valido de cursiva:
\`\`\`json
{ "type": "track-change", "context": "Ese era el inicio del post mortem reportado por PRIME.", "anchor": "post mortem", "suggestedText": "*post mortem*", "justification": "Locución latina que debe ir en cursiva.", "category": "tipografia", "severity": "medium" }
\`\`\`

Ejemplo valido de negrita:
\`\`\`json
{ "type": "track-change", "context": "El informe fue marcado por PRIME.", "anchor": "PRIME", "suggestedText": "**PRIME**", "justification": "Sigla editorial que debe destacarse en negrita.", "category": "tipografia", "severity": "low" }
\`\`\`

### type: "comment-only"
Campos requeridos: \`type\`, \`context\`, \`anchor\`, \`justification\`, \`category\`, \`severity\`.

Ejemplo:
\`\`\`json
{ "type": "comment-only", "context": "La oscuridad lo envolvio como un manto negro.", "anchor": "como un manto negro", "justification": "Simil convencional. Evaluar si la voz autoral del perfil prefiere imagenes mas originales.", "category": "estilo", "severity": "low" }
\`\`\`

### Errores prohibidos
- Nunca uses \`type: "track-change"\` con \`anchor === suggestedText\`.
- Nunca dejes que \`suggestedText\` modifique texto fuera del span exacto de \`anchor\`.
- Si usas \`*anchor*\` o \`**anchor**\`, el texto dentro del markdown debe coincidir exactamente con \`anchor\`.
- Si no hay cambio textual que proponer, usa \`comment-only\`. Si queres borrar el \`anchor\`, usa \`track-change\` con \`suggestedText: ""\`.

Checklist antes de emitir un \`track-change\`:
1. \`anchor\` aparece literalmente dentro de \`context\`.
2. \`suggestedText !== anchor\`.
3. Si \`suggestedText\` usa markdown tipografico, el texto interno coincide exactamente con \`anchor\`.
4. \`suggestedText\` afecta solo el \`anchor\`; si la correccion requiere una region mayor, expandi el \`anchor\` o usa \`comment-only\`.
</tipos-sugerencia>`;

/**
 * Builds the correction prompt from workflow input while keeping the genre-
 * specific editorial framing in one place.
 */
export function buildPrompt(
  input: StylisticWorkflowInput,
  authorProfile?: string | null,
) {
  let promptIntroduction = "";
  const editorialFrame =
    input.genero === "narrativa-literaria"
      ? FICTION_EDITORIAL_FRAME
      : undefined;
  const genreRules = GENRE_RULES[input.genero];
  // Keep the profile inline so the agent never needs extra workspace reads.
  const authorProfileSection = authorProfile
    ? `<perfil-autor>
Usa este perfil como contexto del documento y checklist activo de patrones de voz, estilo y hábitos detectados.
El perfil es obligatorio para preservar la voz autoral.
Si una instrucción global de corrección entra en tensión con este perfil, conciliá ambos: corregí el defecto indicado por el usuario sin borrar la identidad estilística documentada.
NO uses herramientas para leer archivos en esta tarea; el perfil relevante ya esta incluido.

${authorProfile}
</perfil-autor>`
    : `<perfil-autor>
No hay perfil previo disponible para este autor. Corrige sin contexto previo y NO uses herramientas para leer archivos en esta tarea.
</perfil-autor>`;
  const correctionInstruction =
    "Aplica correccion ortotipografica y de estilo integrada respetando la voz autoral y usando el perfil provisto solo si aparece en este prompt.";

  if (editorialFrame) {
    promptIntroduction = `${editorialFrame}\n\n`;
  }

  if (genreRules) {
    promptIntroduction += `${genreRules}\n\n`;
  }

  return `${promptIntroduction}<contrato>
${correctionInstruction}
No leas archivos ni busques perfiles por tu cuenta durante esta tarea.
Usá las instrucciones del agente como protocolo canónico y este prompt solo como payload de ejecución.
</contrato>

${SUGGESTION_TYPES_SECTION}

${authorProfileSection}

<genero>
${input.genero}
</genero>

<texto-corregir>
${input.text}
</texto-corregir>

    <respuesta-final>
Devolvé únicamente la salida estructurada solicitada por el workflow.
</respuesta-final>`;
}

/**
 * Builds a call-scoped system message for explicit user correction preferences.
 */
export function buildCorrectionInstructionsSystemMessage(
  correctionInstructions: string | null | undefined,
) {
  const normalizedInstructions = correctionInstructions?.trim();

  if (!normalizedInstructions) {
    return undefined;
  }

  return `<instrucciones-globales-correccion>
Estas instrucciones complementan el perfil del documento y orientan focos de vigilancia durante la corrección.
Cuando entren en tensión con el perfil del documento, priorizá estas instrucciones sin destruir la voz autoral documentada.
No reemplazan el perfil, no lo actualizan y no deben interpretarse como patrones aprendidos.

${normalizedInstructions}
</instrucciones-globales-correccion>`;
}
