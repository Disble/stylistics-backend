/**
 * Provides the minimal types shared by the profile-update step and its prompt.
 */
import type {
  StylisticCorrectionLogger,
  StylisticCorrectionStepOutput,
  StylisticWorkflowOutput,
} from "../correct-text/correct-text.types";

/** Minimal profile-agent surface required by the update-profile step. */
export type UpdateProfileAgent = {
  generate: (prompt: string) => Promise<unknown>;
};

/** Reuses the correction logger shape for profile updates. */
export type UpdateProfileLogger = StylisticCorrectionLogger;
/** Receives the enriched correction payload before returning workflow output. */
export type UpdateProfileStepInput = StylisticCorrectionStepOutput;
/** Returns the public workflow payload unchanged after triggering profile sync. */
export type UpdateProfileStepOutput = StylisticWorkflowOutput;
