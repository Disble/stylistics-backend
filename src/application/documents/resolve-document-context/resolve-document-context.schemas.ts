import { z } from "zod";

import { DOCUMENT_GENRES } from "../../../domain/documents/document.constants";

export const resolveDocumentContextInputSchema = z.object({
  userId: z.string().min(1),
  externalDocumentKey: z.uuid(),
  title: z.string().trim().min(1).optional(),
  defaultGenre: z.enum(DOCUMENT_GENRES).optional(),
  processingConfig: z.record(z.string(), z.unknown()).optional(),
});
