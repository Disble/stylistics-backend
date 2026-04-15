import { createStep, createWorkflow } from "@mastra/core/workflows";
import {
  correctTextInputSchema,
  correctTextOutputSchema,
  executeCorrectTextStep,
  executeLoadAuthorProfileStep,
  executeUpdateProfileStep,
  loadAuthorProfileInputSchema,
  loadAuthorProfileOutputSchema,
  stylisticWorkflowInputSchema,
  stylisticWorkflowOutputSchema,
  updateProfileInputSchema,
  updateProfileOutputSchema,
} from "../../application/stylistics";
import { modelPool } from "../constants/models";
import { logger } from "../utils/logger";

const STRUCTURED_OUTPUT_MODEL = modelPool["stylistic-agent-output"];

// Step 1 resolves the author profile as explicit workflow state so profile IO
// is traceable in Mastra and the correction step stays pure.
const loadAuthorProfile = createStep({
  id: "load-author-profile",
  description:
    "Carga el perfil del autor y lo adjunta al contexto antes de corregir el texto",
  inputSchema: loadAuthorProfileInputSchema,
  outputSchema: loadAuthorProfileOutputSchema,
  execute: async ({ inputData }) =>
    executeLoadAuthorProfileStep({
      input: inputData,
      logger,
    }),
});

// Step 2 produces the structured correction payload using the already-loaded
// profile context from the previous workflow step.
const correctText = createStep({
  id: "correct-text",
  description:
    "Aplica corrección ortotipográfica y de estilo integrada sobre el texto del autor",
  inputSchema: correctTextInputSchema,
  outputSchema: correctTextOutputSchema,
  execute: async ({ inputData, mastra }) =>
    executeCorrectTextStep({
      agent: mastra?.getAgent("stylisticAgent"),
      logger,
      model: STRUCTURED_OUTPUT_MODEL,
      input: inputData,
    }),
});

// Step 2 updates the persistent author profile from the latest session findings
// and returns the original correction payload unchanged for the workflow caller.
const updateProfile = createStep({
  id: "update-profile",
  description:
    "Actualiza el perfil del autor con los patrones detectados en la corrección",
  inputSchema: updateProfileInputSchema,
  outputSchema: updateProfileOutputSchema,
  execute: async ({ inputData, mastra }) =>
    executeUpdateProfileStep({
      agent: mastra?.getAgent("profileAgent"),
      logger,
      input: inputData,
    }),
});

// Keep the workflow thin: application logic lives in src/application and the
// workflow only orchestrates correction first, then profile maintenance.
const stylisticWorkflow = createWorkflow({
  id: "stylistic-workflow",
  inputSchema: stylisticWorkflowInputSchema,
  outputSchema: stylisticWorkflowOutputSchema,
})
  .then(loadAuthorProfile) // NOSONAR - Mastra DSL chaining, not Promise chaining
  .then(correctText) // NOSONAR - Mastra DSL chaining, not Promise chaining
  .then(updateProfile); // NOSONAR - Mastra DSL chaining, not Promise chaining

stylisticWorkflow.commit();

export { stylisticWorkflowInputSchema } from "../../application/stylistics";
export { stylisticWorkflow };
