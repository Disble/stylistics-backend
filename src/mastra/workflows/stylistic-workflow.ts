import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { logger } from "../utils/logger";
import { editorialWorkflowOutputSchema } from "./editorial-workflow";

// Schema for the correction agent's structured output (suggestions + cleanPatterns)
const correctorOutputSchema = z.object({
  suggestions: z.array(
    z.object({
      originalText: z.string(),
      suggestedText: z.string(),
      justification: z.string(),
      category: z.string(),
      severity: z.enum(["high", "medium", "low"]),
    }),
  ),
  cleanPatterns: z.array(z.string()),
});

const stylisticWorkflowInputSchema = z.object({
  text: z.string().describe("Texto a corregir"),
  autorSlug: z
    .string()
    .default("Disble")
    .describe(
      "Identificador del autor en kebab-case (ej: maria-garcia). Se usa para cargar el perfil desde workspace/autores/{autorSlug}.md",
    ),
  genero: z
    .enum([
      "narrativa-literaria",
      "ensayo-academico",
      "periodismo-cultural",
      "general",
    ])
    .default("general")
    .describe("Género del texto, para aplicar criterios específicos"),
});

// Intermediate schema: corrections + metadata for the profile step
const correctionOutputSchema = z.object({
  suggestions: z.array(
    z.object({
      originalText: z.string(),
      suggestedText: z.string(),
      justification: z.string(),
      category: z.string(),
      severity: z.enum(["high", "medium", "low"]),
    }),
  ),
  cleanPatterns: z.array(z.string()),
  autorSlug: z.string(),
});

// Step 1: Stylistic Agent corrects the text
// Reads author's REFLEXIONES for context, does NOT update the profile
const correctText = createStep({
  id: "correct-text",
  description:
    "Aplica corrección ortotipográfica y de estilo integrada sobre el texto del autor",
  inputSchema: stylisticWorkflowInputSchema,
  outputSchema: correctionOutputSchema,
  execute: async ({ inputData, mastra }) => {
    logger.info(
      {
        autorSlug: inputData.autorSlug,
        genero: inputData.genero,
        textLength: inputData.text.length,
      },
      "✏️ Iniciando corrección estilística",
    );

    const agent = mastra?.getAgent("stylisticAgent");
    if (!agent) {
      logger.error("❌ Stylistic agent not found");
      throw new Error("Stylistic agent not found");
    }

    logger.info("🤖 Stylistic agent encontrado, iniciando corrección...");

    const autorProfilePath = `autores/${inputData.autorSlug}.md`;

    const prompt =
      `EJECUTA los siguientes pasos EN ORDEN. No omitas ninguno.\n\n` +
      `## PASO 1 — CARGA DEL PERFIL DEL AUTOR\n` +
      `Leé el perfil completo del autor: ${autorProfilePath}\n` +
      `Si no existe, procedé sin contexto previo (primera sesión).\n` +
      `Usá los patrones del perfil como checklist activo durante la corrección.\n\n` +
      `## PASO 2 — CORRECCIÓN\n` +
      `Género del texto: ${inputData.genero}\n\n` +
      `Texto a corregir:\n${inputData.text}\n\n` +
      `Aplica la metodología completa de corrección ortotipográfica y de estilo integrada.\n` +
      `Usa las reflexiones del autor como contexto de máxima prioridad.\n\n` +
      `## PASO 3 — OUTPUT\n` +
      `Devuelve el resultado como un objeto JSON con dos campos:\n` +
      `1. "suggestions": array donde cada elemento tiene: ` +
      `originalText (fragmento MÍNIMO del original que contiene el error — NUNCA párrafos enteros, solo las 2-4 palabras alrededor de la corrección), ` +
      `suggestedText (versión corregida del MISMO fragmento mínimo), ` +
      `justification (explicación técnica de por qué se corrige), ` +
      `category (ortografia | gramatica | puntuacion | tipografia | estilo-nivelA | estilo-nivelB | estilo-nivelC), ` +
      `severity (high para Nivel A, medium para Nivel B, low para Nivel C).\n` +
      `2. "cleanPatterns": array de strings con patrones del perfil que encontraste usados CORRECTAMENTE en el texto. ` +
      `Solo patrones con evidencia positiva real. Array vacío si es primera sesión.\n\n` +
      `REGLA CRÍTICA: originalText debe ser el fragmento más CORTO que permita localizar la corrección. ` +
      `Si cambiás un signo de puntuación, marcá solo las palabras adyacentes, NO la oración ni el párrafo.`;

    logger.debug({ prompt }, "stylistic-workflow prompt");

    const stream = await agent.stream(prompt, {
      structuredOutput: {
        schema: correctorOutputSchema,
        jsonPromptInjection: true,
      },
    });

    for await (const chunk of stream.textStream) {
      logger.debug({ chunk }, "stylistic-workflow stream chunk");
    }

    const object = await stream.object;

    if (!object) {
      logger.error("⚠️ El agente no devolvió output estructurado");
      throw new Error("No output structured received from stylistic agent");
    }

    logger.info(
      { suggestions: object.suggestions.length },
      "✅ Corrección estilística completada",
    );

    // Return suggestions + cleanPatterns + autorSlug for the profile step
    return {
      suggestions: object.suggestions,
      cleanPatterns: object.cleanPatterns ?? [],
      autorSlug: inputData.autorSlug,
    };
  },
});

// Step 2: Profile Agent updates the author's profile
// Receives suggestions from step 1, updates profile, passes through suggestions
const updateProfile = createStep({
  id: "update-profile",
  description:
    "Actualiza el perfil del autor con los patrones detectados en la corrección",
  inputSchema: correctionOutputSchema,
  outputSchema: editorialWorkflowOutputSchema,
  execute: async ({ inputData, mastra }) => {
    logger.info(
      {
        autorSlug: inputData.autorSlug,
        suggestionsCount: inputData.suggestions.length,
      },
      "📋 Iniciando actualización de perfil",
    );

    const agent = mastra?.getAgent("profileAgent");
    if (!agent) {
      logger.error("❌ Profile agent not found");
      throw new Error("Profile agent not found");
    }

    const autorProfilePath = `autores/${inputData.autorSlug}.md`;

    const prompt =
      `Actualizá el perfil del autor "${inputData.autorSlug}".\n\n` +
      `Perfil del autor: ${autorProfilePath}\n` +
      `Skill de referencia: skills/perfil-autor/SKILL.md\n\n` +
      `Sugerencias de corrección de esta sesión:\n` +
      `${JSON.stringify(inputData.suggestions, null, 2)}\n\n` +
      `Patrones encontrados limpios (evidencia positiva):\n` +
      `${JSON.stringify(inputData.cleanPatterns, null, 2)}\n\n` +
      `Ejecutá las 4 fases: OBSERVAR → TRANSICIONAR → PODAR → REFLEJAR.\n` +
      `Escribí el perfil actualizado en ${autorProfilePath} usando la herramienta de escritura del workspace.`;

    logger.debug({ prompt }, "profile-update prompt");

    await agent.generate(prompt);

    logger.info({ autorSlug: inputData.autorSlug }, "✅ Perfil actualizado");

    // Passthrough: return the suggestions for the frontend
    return { suggestions: inputData.suggestions };
  },
});

// Workflow: 2 sequential steps
const stylisticWorkflow = createWorkflow({
  id: "stylistic-workflow",
  inputSchema: stylisticWorkflowInputSchema,
  outputSchema: editorialWorkflowOutputSchema,
})
  .then(correctText)
  .then(updateProfile);

stylisticWorkflow.commit();

export { stylisticWorkflow, stylisticWorkflowInputSchema };
