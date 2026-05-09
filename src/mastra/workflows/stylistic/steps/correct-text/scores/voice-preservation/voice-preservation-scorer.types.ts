import type { z } from "zod";

import type { voicePreservationAnalysisSchema } from "./voice-preservation-scorer.schemas";

/** Structured analysis result emitted by the voice-preservation scorer. */
export type VoicePreservationAnalysis = z.infer<
  typeof voicePreservationAnalysisSchema
>;
