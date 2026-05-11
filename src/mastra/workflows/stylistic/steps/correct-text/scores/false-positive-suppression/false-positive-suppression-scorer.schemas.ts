import { z } from "zod";

export const falsePositiveFindingSchema = z.object({
  anchor: z.string(),
  category: z.string(),
  concern: z.string(),
  strength: z.enum(["strong", "moderate"]),
});

export const falsePositiveSuppressionAnalysisSchema = z.object({
  applicableSuggestions: z.number().int().nonnegative(),
  falsePositiveFindings: z.array(falsePositiveFindingSchema).default([]),
  precisionLevel: z.enum(["high", "mixed", "low"]),
  confidence: z.number().min(0).max(1).default(1),
  summary: z.string().default(""),
});
