import { buildApplyDocumentFeedbackPrompt } from "./apply-document-feedback.helpers";
import {
  applyDocumentFeedbackInputSchema,
  applyDocumentFeedbackResultSchema,
} from "./apply-document-feedback.schemas";
import type {
  ApplyDocumentFeedbackInput,
  ApplyDocumentFeedbackResult,
  DocumentFeedbackAgent,
  DocumentFeedbackRepository,
} from "./apply-document-feedback.types";

/** Processes one explicit feedback comment against a persisted document profile. */
export async function applyDocumentFeedback(
  input: ApplyDocumentFeedbackInput,
  dependencies: {
    agent: DocumentFeedbackAgent;
    repository: DocumentFeedbackRepository;
  },
): Promise<ApplyDocumentFeedbackResult> {
  const parsedInput = applyDocumentFeedbackInputSchema.parse(input);
  const prompt = buildApplyDocumentFeedbackPrompt(parsedInput);
  const result = await dependencies.agent.generate(prompt, {
    structuredOutput: {
      schema: applyDocumentFeedbackResultSchema,
    },
  });

  if (!result.object) {
    throw new Error(
      "Document feedback agent did not return structured output.",
    );
  }

  const parsedResult = applyDocumentFeedbackResultSchema.parse(result.object);

  if (parsedResult.status === "updated") {
    if (!parsedResult.profileMarkdown) {
      throw new Error(
        "Document feedback agent returned an updated status without profile markdown.",
      );
    }

    await dependencies.repository.updateDocumentStyleProfile({
      documentStyleProfileId: parsedInput.documentStyleProfileId,
      profileMarkdown: parsedResult.profileMarkdown,
    });
  }

  return parsedResult;
}
