/**
 * Provides the inferred types shared by the preference-guided correction step.
 */
import type { z } from "zod";

import type { StylisticProfileContext } from "../load-author-profile/load-author-profile.types";
import type { preferenceGuidedCorrectionOutputSchema } from "./preference-guided-correction.schemas";

/** Input consumed by the preference-guided pre-step. */
export type PreferenceGuidedCorrectionStepInput = StylisticProfileContext;

/** Output emitted toward the integrated correct-text step. */
export type PreferenceGuidedCorrectionStepOutput = z.infer<
  typeof preferenceGuidedCorrectionOutputSchema
>;
