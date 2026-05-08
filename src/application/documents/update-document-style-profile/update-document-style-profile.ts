import { buildUpdateDocumentStyleProfilePrompt } from "./update-document-style-profile.helpers";
import {
  updateDocumentStyleProfileInputSchema,
  updateDocumentStyleProfileResultSchema,
} from "./update-document-style-profile.schemas";
import type {
  DocumentStyleProfileAgent,
  DocumentStyleProfileRepository,
  UpdateDocumentStyleProfileInput,
  UpdateDocumentStyleProfileResult,
} from "./update-document-style-profile.types";

/**
 * Generates and persists the next document style profile state from one
 * correction session.
 */
export async function updateDocumentStyleProfile(
  input: UpdateDocumentStyleProfileInput,
  dependencies: {
    agent: DocumentStyleProfileAgent;
    repository: DocumentStyleProfileRepository;
  },
): Promise<UpdateDocumentStyleProfileResult> {
  const parsedInput = updateDocumentStyleProfileInputSchema.parse(input);
  const prompt = buildUpdateDocumentStyleProfilePrompt(parsedInput);
  const result = await dependencies.agent.generate(prompt, {
    structuredOutput: {
      schema: updateDocumentStyleProfileResultSchema,
    },
  });

  if (!result.object) {
    throw new Error("Document profile agent did not return structured output.");
  }

  const parsedResult = updateDocumentStyleProfileResultSchema.parse(
    result.object,
  );

  await dependencies.repository.updateDocumentStyleProfile({
    documentStyleProfileId: parsedInput.documentStyleProfileId,
    profileMarkdown: parsedResult.profileMarkdown,
  });

  return parsedResult;
}
