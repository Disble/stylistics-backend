import { z } from "zod";

import { DOCUMENT_GENRES } from "../../domain/documents/document.constants";

export const resolveDocumentContextRouteRequestSchema = z
  .object({
    documentUuid: z.uuid(),
    title: z.string().trim().min(1).optional(),
    genero: z.enum(DOCUMENT_GENRES).optional(),
    processingConfig: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();
