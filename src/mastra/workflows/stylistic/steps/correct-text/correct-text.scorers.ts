import { falsePositiveSuppressionScorer } from "./scores/false-positive-suppression/false-positive-suppression.scorer";
import { voicePreservationScorer } from "./scores/voice-preservation/voice-preservation.scorer";

export const correctTextScorers = {
  falsePositiveSuppressionScorer,
  voicePreservationScorer,
};
