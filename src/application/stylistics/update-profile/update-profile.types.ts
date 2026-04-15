import type {
  StylisticCorrectionLogger,
  StylisticCorrectionStepOutput,
  StylisticWorkflowOutput,
} from "../correct-text/correct-text.types";

export type UpdateProfileAgent = {
  generate: (prompt: string) => Promise<unknown>;
};

export type UpdateProfileLogger = StylisticCorrectionLogger;
export type UpdateProfileStepInput = StylisticCorrectionStepOutput;
export type UpdateProfileStepOutput = StylisticWorkflowOutput;
