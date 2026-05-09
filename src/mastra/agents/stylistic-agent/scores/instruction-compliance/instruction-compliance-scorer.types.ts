import type { z } from "zod";

import type { instructionComplianceAnalysisSchema } from "./instruction-compliance-scorer.schemas";

/** Structured analysis result emitted by the instruction-compliance scorer. */
export type InstructionComplianceAnalysis = z.infer<
  typeof instructionComplianceAnalysisSchema
>;
