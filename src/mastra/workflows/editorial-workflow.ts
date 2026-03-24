import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { logger } from "../utils/logger";

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

const editorialWorkflowInputSchema = z.object({
  text: z.string(),
  profile: z.string(),
  language: z.string(),
});

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

    // Stream with logging
    for await (const chunk of stream.textStream) {
      logger.debug({ chunk }, "editorial-workflow stream chunk");
    }

    // Get structured object from stream
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

const editorialWorkflow = createWorkflow({
  id: "editorial-workflow",
  inputSchema: editorialWorkflowInputSchema,
  outputSchema: editorialWorkflowOutputSchema,
}).then(analyzeText);

editorialWorkflow.commit();

export {
  editorialWorkflow,
  editorialWorkflowInputSchema,
  editorialWorkflowOutputSchema,
};
