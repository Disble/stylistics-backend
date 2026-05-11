import { z } from "zod";

export const instructionComplianceViolationSchema = z.object({
  anchor: z.string().default(""),
  category: z.string().default(""),
  reason: z.string(),
});

export const instructionComplianceAnalysisSchema = z.object({
  hasExplicitInstructions: z.boolean(),
  instructionMode: z.enum(["none", "restriction", "focus", "mixed"]),
  complianceLevel: z.enum(["strong", "partial", "weak"]),
  violations: z.array(instructionComplianceViolationSchema).default([]),
  confidence: z.number().min(0).max(1).default(1),
  summary: z.string().default(""),
});
