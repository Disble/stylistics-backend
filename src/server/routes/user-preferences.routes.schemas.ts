import { z } from "zod";

import { CORRECTION_INSTRUCTIONS_MAX_LENGTH } from "../../domain/user-preferences/user-preferences.constants";

export const updateUserPreferencesRouteRequestSchema = z
  .object({
    correctionInstructions: z
      .string()
      .max(CORRECTION_INSTRUCTIONS_MAX_LENGTH)
      .nullable(),
  })
  .strict();
