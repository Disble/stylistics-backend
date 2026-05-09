import type { z } from "zod";

import type { falsePositiveSuppressionAnalysisSchema } from "./false-positive-suppression-scorer.schemas";

/** Structured analysis result emitted by the false-positive suppression scorer. */
export type FalsePositiveSuppressionAnalysis = z.infer<
  typeof falsePositiveSuppressionAnalysisSchema
>;
