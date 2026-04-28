/**
 * Defines the feedback workflow that classifies author feedback and delegates
 * actionable comments to the profile-feedback agent.
 */
import { createWorkflow } from "@mastra/core/workflows";
import {
  feedbackWorkflowInputSchema,
  loadAuthorProfile,
  processFeedback,
  processFeedbackOutputSchema,
} from "./steps";

const feedbackWorkflow = createWorkflow({
  id: "feedback-workflow",
  inputSchema: feedbackWorkflowInputSchema,
  outputSchema: processFeedbackOutputSchema,
})
  .then(loadAuthorProfile) // NOSONAR - Mastra DSL chaining, not Promise chaining
  .then(processFeedback); // NOSONAR

feedbackWorkflow.commit();

export { feedbackWorkflow, feedbackWorkflowInputSchema };
