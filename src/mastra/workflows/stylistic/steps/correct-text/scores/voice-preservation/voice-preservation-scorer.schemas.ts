import { z } from "zod";

export const voiceDriftFindingSchema = z.object({
  anchor: z.string(),
  category: z.string(),
  concern: z.string(),
  severity: z.enum(["strong", "moderate"]),
});

export const voicePreservationAnalysisSchema = z.object({
  voiceDriftFindings: z.array(voiceDriftFindingSchema).default([]),
  preservesRegister: z.boolean(),
  preservesGenreLicense: z.boolean(),
  preservationLevel: z.enum(["strong", "mixed", "weak"]),
  confidence: z.number().min(0).max(1).default(1),
  summary: z.string().default(""),
});
