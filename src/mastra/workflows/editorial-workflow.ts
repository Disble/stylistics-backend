/**
 * Defines a sample editorial workflow that requests structured editorial
 * suggestions from the editorial agent.
 */
import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { logger } from "../../shared/logger";

/** Describes the structured editorial suggestions returned by the workflow. */
const editorialWorkflowOutputSchema = z.object({
  suggestions: z.array(
    z.object({
      originalText: z.string(),
      suggestedText: z.string(),
      justification: z.string(),
      category: z.string(),
      severity: z.enum(["high", "medium", "low"]),
    }),
  ),
});

/** Validates the public input accepted by the editorial workflow. */
const editorialWorkflowInputSchema = z.object({
  text: z.string(),
  profile: z.string(),
  language: z.string(),
});

/** Invokes the editorial agent and enforces the structured output contract. */
const analyzeText = createStep({
  id: "analyze-text",
  description: "Analyzes text and returns editorial suggestions",
  inputSchema: editorialWorkflowInputSchema,
  outputSchema: editorialWorkflowOutputSchema,
  execute: async ({ inputData, mastra }) => {
    logger.info(
      {
        profile: inputData.profile,
        language: inputData.language,
        textLength: inputData.text.length,
      },
      "📝 Iniciando análisis editorial",
    );

    const agent = mastra?.getAgent("editorialAgent");
    if (!agent) {
      logger.error("❌ Editorial agent not found");
      throw new Error("Editorial agent not found");
    }

    logger.info("🤖 Editorial agent encontrado, generando sugerencias...");

    const prompt = `Analiza este texto y devuelve sugerencias editoriales en JSON. Perfil: ${inputData.profile}. Texto: ${inputData.text}`;

    logger.debug({ prompt }, "editorial-workflow prompt");

    const stream = await agent.stream(prompt, {
      structuredOutput: { schema: editorialWorkflowOutputSchema },
    });

    // Stream with logging so prompt/debugging sessions retain intermediate text.
    for await (const chunk of stream.textStream) {
      logger.debug({ chunk }, "editorial-workflow stream chunk");
    }

    // The stream must still resolve to one final structured object.
    const object = await stream.object;

    if (!object) {
      logger.error("⚠️ El agente no devolvió output estructurado");
      throw new Error("No output");
    }

    logger.info(
      {
        suggestions: object.suggestions.length,
      },
      "✅ Análisis editorial completado",
    );

    return object;
  },
});

/** Keeps the workflow declarative by composing a single editorial-analysis step. */
const editorialWorkflow = createWorkflow({
  id: "editorial-workflow",
  inputSchema: editorialWorkflowInputSchema,
  outputSchema: editorialWorkflowOutputSchema,
}).then(analyzeText); // NOSONAR - Mastra workflow DSL chaining, not Promise chaining

editorialWorkflow.commit();

export {
  editorialWorkflow,
  editorialWorkflowInputSchema,
  editorialWorkflowOutputSchema,
};
