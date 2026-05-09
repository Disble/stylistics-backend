/**
 * Re-exports the correction-step schemas used by the profile-update step.
 */
import { z } from "zod";

export {
  stylisticCorrectionStepSchema as updateProfileInputSchema,
  stylisticWorkflowOutputSchema as updateProfileOutputSchema,
} from "../correct-text/correct-text.schemas";

/** Structured result expected from the document-profile agent. */
export const updateDocumentStyleProfileResultSchema = z.object({
  profileMarkdown: z.string().min(1),
  changeSummary: z.string().min(1),
});
