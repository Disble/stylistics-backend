import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";

const outputSchema = z.object({
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

const inputSchema = z.object({
  text: z.string(),
  profile: z.string(),
  language: z.string(),
});

const analyzeText = createStep({
  id: "analyze-text",
  description: "Analyzes text and returns editorial suggestions",
  inputSchema,
  outputSchema,
  execute: async ({ inputData, mastra }) => {
    const agent = mastra?.getAgent("editorialAgent");
    if (!agent) throw new Error("Editorial agent not found");

    const result = await agent.generate(
      `Analiza este texto y devuelve sugerencias editoriales en JSON. Perfil: ${inputData.profile}. Texto: ${inputData.text}`,
      { structuredOutput: { schema: outputSchema } },
    );

    if (!result.object) throw new Error("No output");
    return result.object;
  },
});

const editorialWorkflow = createWorkflow({
  id: "editorial-workflow",
  inputSchema,
  outputSchema,
}).then(analyzeText);

editorialWorkflow.commit();

export { editorialWorkflow };
