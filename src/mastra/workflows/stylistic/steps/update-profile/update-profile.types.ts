/**
 * Provides the minimal types shared by the profile-update step and its prompt.
 */
import type {
  StylisticCorrectionLogger,
  StylisticCorrectionStepOutput,
  StylisticWorkflowOutput,
} from "../correct-text/correct-text.types";

/** Input used to generate the next persisted document style profile. */
export type UpdateDocumentStyleProfileInput = {
  documentStyleProfileId: string;
  currentProfileMarkdown: string;
  correctionPatternsWordCount: number;
  suggestions: StylisticCorrectionStepOutput["suggestions"];
  cleanPatterns: string[];
};

/** Structured result returned by the document-profile agent. */
export type UpdateDocumentStyleProfileResult = {
  profileMarkdown: string;
  changeSummary: string;
};

/** Reuses the correction logger shape for profile updates. */
export type UpdateProfileLogger = StylisticCorrectionLogger;
/** Receives the enriched correction payload before returning workflow output. */
export type UpdateProfileStepInput = StylisticCorrectionStepOutput;
/** Returns the public workflow payload unchanged after triggering profile sync. */
export type UpdateProfileStepOutput = StylisticWorkflowOutput;
