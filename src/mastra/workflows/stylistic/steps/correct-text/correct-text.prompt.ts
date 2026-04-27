/**
 * Builds the author-aware correction prompt used by the stylistic step.
 */
import type { StylisticWorkflowInput } from "../load-author-profile/load-author-profile.types";

type PromptGenre = StylisticWorkflowInput["genero"];

/** Frames fiction requests as editorial analysis rather than content judgment. */
const FICTION_EDITORIAL_FRAME = `## MARCO PROFESIONAL EDITORIAL
Esta solicitud corresponde a una correccion ortotipografica y de estilo en una casa editorial.
El texto es ficcion literaria y el analisis pedido es linguistico y estilistico, no de contenido.
La presencia de violencia, conflicto, lenguaje adulto o temas oscuros puede ser material editorial legitimo del genero.`;

/** Adds genre-specific editorial constraints without duplicating workflow logic. */
const GENRE_RULES: Partial<Record<PromptGenre, string>> = {
  "narrativa-literaria": `## CRITERIOS DE GÊNERO: NARRATIVA LITERARIA
- Distingue error gramatical de licencia literaria (sintaxis expresiva, fragmentos deliberados, puntuacion ritmica, repeticiones estilisticas).
- Respeta convenciones del genero: dialogos con rayas, analepsis/prolepsis como recursos intencionales.
- No apliques economia expresiva academica: la prosa de ficcion puede ser elaborada por eleccion estetica.
- Dialectalismos, sociolectos y registros coloquiales de personajes son caracterizacion, no errores.
- Respeta tiempos verbales como recurso narrativo (presente historico, alternancia intencional).
- No corregir neologismos, arcaismos o terminos de epoca funcionales al mundo narrativo.`,
  "ensayo-academico": `## CRITERIOS DE GÊNERO: ENSAYO ACADÊMICO
- Prioriza la precision conceptual, el rigor argumentativo y el uso correcto de conectores logicos.`,
  "periodismo-cultural": `## CRITERIOS DE GÊNERO: PERIODISMO CULTURAL
- Busca el equilibrio entre accesibilidad y profundidad, preservando el gancho periodistico.`,
};

/** Documents the structured-output contract that the agent must honor. */
const SUGGESTION_TYPES_SECTION = `## TIPOS DE SUGERENCIA
Cada item en \`suggestions\` DEBE incluir un campo \`type\` con uno de estos dos valores:

Cada item en \`suggestions\` DEBE incluir \`category\` usando una de las categorías canónicas definidas en tus instrucciones de agente y validadas por el schema de salida.

### type: "track-change"
Usalo cuando quieras proponer un reemplazo concreto de texto.
Este tipo SOLO sirve cuando el cambio puede expresarse como \`replace(anchor) -> suggestedText\`.
- \`context\`: fragmento suficientemente largo para localizar la correccion de forma inequivoca en el documento.
- \`anchor\`: parte exacta que se resalta y reemplaza (puede ser un solo caracter, una palabra o un parrafo completo). Debe estar contenida literalmente dentro de \`context\`.
- \`suggestedText\`: reemplazo exacto del anchor. Debe reemplazar SOLO el anchor, nunca todo el context salvo que anchor sea ese context completo. NUNCA igual al anchor.
Campos requeridos: \`type\`, \`context\`, \`anchor\`, \`suggestedText\`, \`justification\`, \`category\`, \`severity\`.

Ejemplo valido:
\`\`\`json
{ "type": "track-change", "context": "El chico corrio rapido por el pasillo.", "anchor": "corrio", "suggestedText": "corrió", "justification": "Falta tilde en forma verbal aguda terminada en vocal.", "category": "ortografia", "severity": "high" }
\`\`\`

Ejemplo invalido:
\`\`\`json
{ "type": "track-change", "context": "—¡¿Ah?! ¿Por que habria de estar interesada en…?", "anchor": "¡¿Ah?!", "suggestedText": "—¡Ah! ¿Por que habria de estar interesada en…?", "justification": "Normalizacion de signos.", "category": "tipografia", "severity": "high" }
\`\`\`
Es invalido porque \`anchor\` cubre solo un fragmento, pero \`suggestedText\` reescribe todo \`context\`. Si la correccion real abarca una region mayor, agranda el \`anchor\` para cubrir todo el span de reemplazo o usa \`comment-only\`.

### type: "comment-only"
Usalo cuando quieras hacer una observacion editorial SIN proponer un cambio de texto. El texto NO se toca.
- \`context\`: fragmento suficientemente largo para localizar el comentario de forma inequivoca en el documento.
- \`anchor\`: parte exacta sobre la que recae el comentario. Debe estar contenida literalmente dentro de \`context\`.
Casos de uso tipicos: senalar una eleccion estilistica discutible, advertir sobre un patron recurrente, elogiar un uso correcto que vale la pena reforzar, o dejar una nota de contexto.
Campos requeridos: \`type\`, \`context\`, \`anchor\`, \`justification\`, \`category\`, \`severity\`.

Ejemplo:
\`\`\`json
{ "type": "comment-only", "context": "La oscuridad lo envolvio como un manto negro.", "anchor": "como un manto negro", "justification": "Simil convencional. Evaluar si la voz autoral del perfil prefiere imagenes mas originales.", "category": "estilo", "severity": "low" }
\`\`\`

REGLA CRITICA: \`anchor\` debe ser una subcadena literal de \`context\`.
NUNCA uses \`type: "track-change"\` con \`anchor === suggestedText\`.
Si no hay cambio de texto que proponer, usa \`type: "comment-only"\`.

Checklist antes de emitir un \`track-change\`:
1. \`anchor\` aparece literalmente dentro de \`context\`.
2. \`suggestedText !== anchor\`.
3. \`suggestedText\` reemplaza solo el \`anchor\`, no texto fuera de ese span.
4. Si la correccion real requiere reescribir una region mayor, expandi el \`anchor\` al span exacto de reemplazo o usa \`comment-only\`.`;

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
    ? `## PERFIL DEL AUTOR
Usa este perfil como contexto de maxima prioridad y como checklist activo de patrones. NO uses herramientas para leer archivos en esta tarea; el perfil relevante ya esta incluido.

${authorProfile}`
    : `## PERFIL DEL AUTOR
No hay perfil previo disponible para este autor. Corrige sin contexto previo y NO uses herramientas para leer archivos en esta tarea.`;
  const correctionInstruction =
    "Aplica correccion ortotipografica y de estilo integrada respetando la voz autoral y usando el perfil provisto solo si aparece en este prompt.";

  if (editorialFrame) {
    promptIntroduction = `${editorialFrame}\n\n`;
  }

  if (genreRules) {
    promptIntroduction += `${genreRules}\n\n`;
  }

  return `${promptIntroduction}${SUGGESTION_TYPES_SECTION}\n\n${authorProfileSection}\n\nGenero del texto: ${input.genero}\n\nTexto a corregir:\n${input.text}\n\n${correctionInstruction}`;
}
