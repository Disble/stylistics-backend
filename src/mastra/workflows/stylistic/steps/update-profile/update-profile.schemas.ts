/**
 * Re-exports the correction-step schemas used by the profile-update step.
 */
export {
  stylisticCorrectionStepSchema as updateProfileInputSchema,
  stylisticWorkflowOutputSchema as updateProfileOutputSchema,
} from "../correct-text/correct-text.schemas";
