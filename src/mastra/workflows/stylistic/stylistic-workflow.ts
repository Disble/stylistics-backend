/**
 * Composes the deterministic stylistic-correction pipeline from the colocated
 * Mastra workflow steps.
 */
import { createWorkflow } from "@mastra/core/workflows";
import {
  correctText,
  loadAuthorProfile,
  stylisticWorkflowInputSchema,
  stylisticWorkflowOutputSchema,
  updateProfile,
} from "./steps";

// Keep the workflow thin: the feature folder owns its steps, and the workflow
// only orchestrates profile loading, correction, and profile maintenance.
const stylisticWorkflow = createWorkflow({
  id: "stylistic-workflow",
  inputSchema: stylisticWorkflowInputSchema,
  outputSchema: stylisticWorkflowOutputSchema,
})
  .then(loadAuthorProfile) // NOSONAR - Mastra DSL chaining, not Promise chaining
  .then(correctText) // NOSONAR - Mastra DSL chaining, not Promise chaining
  .then(updateProfile); // NOSONAR - Mastra DSL chaining, not Promise chaining

stylisticWorkflow.commit();

export { stylisticWorkflowInputSchema } from "./steps";
export { stylisticWorkflow };
