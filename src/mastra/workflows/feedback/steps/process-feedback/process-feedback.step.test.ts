import { describe, expect, it, mock } from "bun:test";

import { PgDocumentRepository } from "../../../../../infrastructure/persistence/repositories/document.repository";
import { processFeedback } from "./process-feedback.step";

function createDocumentInput() {
  return {
    category: "estilo",
    context: "Full paragraph context.",
    anchor: "target text",
    suggestedText: "replacement text",
    justification: "Original correction justification.",
    action: "reject" as const,
    severity: "medium" as const,
    suggestionType: "track-change" as const,
    comment: "Please keep this rhythm.",
    documentUuid: "44444444-4444-4444-8444-444444444444",
    authorProfile: "# Current profile",
    documentContext: {
      documentId: "11111111-1111-4111-8111-111111111111",
      documentStyleProfileId: "22222222-2222-4222-8222-222222222222",
      documentPreferencesId: "33333333-3333-4333-8333-333333333333",
      documentUuid: "44444444-4444-4444-8444-444444444444",
      defaultGenre: "general" as const,
      processingConfig: { chunking: { mode: "default" } },
    },
  };
}

function createStepParams(
  inputData: ReturnType<typeof createDocumentInput>,
  mastra?: { getAgent: (id: string) => unknown },
) {
  return {
    inputData,
    mastra,
    runId: "run-id",
    workflowId: "workflow-id",
    requestContext: {},
    state: undefined,
    retryCount: 0,
    resourceId: undefined,
    resumeData: undefined,
    suspendData: undefined,
    restart: false,
    engine: undefined,
    abortSignal: new AbortController().signal,
    writer: undefined,
    outputWriter: undefined,
    validateSchemas: false,
    setState: async () => undefined,
    getInitData: () => inputData,
    getStepResult: () => undefined,
    suspend: async () => undefined as never,
    bail: () => undefined as never,
    abort: () => undefined,
  } as unknown as Parameters<typeof processFeedback.execute>[0];
}

describe("processFeedback step", () => {
  it("persists DB-backed document feedback", async () => {
    const updateDocumentStyleProfileMock = mock(async () => undefined);
    const originalUpdateDocumentStyleProfile =
      PgDocumentRepository.prototype.updateDocumentStyleProfile;
    const agent = {
      generate: mock(async () => ({
        object: {
          status: "updated",
          decisionSummary: "Added one explicit intervention criterion.",
          profileMarkdown: "# Updated profile",
        },
      })),
    };

    PgDocumentRepository.prototype.updateDocumentStyleProfile =
      updateDocumentStyleProfileMock;

    try {
      const result = (await processFeedback.execute(
        createStepParams(createDocumentInput(), {
          getAgent: (agentId: string) =>
            agentId === "documentFeedbackAgent" ? agent : undefined,
        }),
      )) as { received: boolean; receivedAt: string };

      expect(result.received).toBe(true);
      expect(agent.generate).toHaveBeenCalledTimes(1);
      expect(updateDocumentStyleProfileMock).toHaveBeenCalledWith({
        documentStyleProfileId: "22222222-2222-4222-8222-222222222222",
        profileMarkdown: "# Updated profile",
      });
    } finally {
      PgDocumentRepository.prototype.updateDocumentStyleProfile =
        originalUpdateDocumentStyleProfile;
    }
  });

  it("ignores empty-comment feedback before calling the agent", async () => {
    const agent = {
      generate: mock(async () => ({ text: "ignored" })),
    };

    const result = (await processFeedback.execute(
      createStepParams(
        {
          ...createDocumentInput(),
          comment: "",
        },
        {
          getAgent: (agentId: string) =>
            agentId === "documentFeedbackAgent" ? agent : undefined,
        },
      ),
    )) as { received: boolean; receivedAt: string };

    expect(result.received).toBe(true);
    expect(agent.generate).not.toHaveBeenCalled();
  });
});
