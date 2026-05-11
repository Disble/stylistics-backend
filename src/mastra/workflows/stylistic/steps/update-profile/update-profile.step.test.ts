import { describe, expect, it, mock } from "bun:test";

import { PgDocumentRepository } from "../../../../../infrastructure/persistence/repositories/document.repository";
import { updateProfile } from "./update-profile.step";

function createDocumentInput() {
  return {
    documentUuid: "44444444-4444-4444-8444-444444444444",
    documentContext: {
      documentId: "11111111-1111-4111-8111-111111111111",
      documentStyleProfileId: "22222222-2222-4222-8222-222222222222",
      documentPreferencesId: "33333333-3333-4333-8333-333333333333",
      documentUuid: "44444444-4444-4444-8444-444444444444",
      defaultGenre: "general" as const,
      processingConfig: { chunking: { mode: "default" } },
    },
    suggestions: [
      {
        type: "comment-only" as const,
        context: "Sample context",
        anchor: "Sample",
        justification: "Clarify the sentence.",
        category: "estilo" as const,
        severity: "medium" as const,
      },
    ],
    cleanPatterns: ["keeps-short-sentences"],
    authorProfile: "# Current profile",
    authorProfileCorrectionPatternsWordCount: 42,
  };
}

function createStepParams(mastra?: { getAgent: (id: string) => unknown }) {
  return {
    inputData: createDocumentInput(),
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
    getInitData: () => createDocumentInput(),
    getStepResult: () => undefined,
    suspend: async () => undefined as never,
    bail: () => undefined as never,
    abort: () => undefined,
  } as unknown as Parameters<typeof updateProfile.execute>[0];
}

describe("updateProfile step", () => {
  it("persists a DB-backed document profile", async () => {
    const updateDocumentStyleProfileMock = mock(async () => undefined);
    const originalUpdateDocumentStyleProfile =
      PgDocumentRepository.prototype.updateDocumentStyleProfile;
    const agent = {
      generate: mock(async () => ({
        text: "ignored",
        object: {
          profileMarkdown: "# Updated profile",
          changeSummary: "Merged duplicate style patterns.",
        },
      })),
    };

    PgDocumentRepository.prototype.updateDocumentStyleProfile =
      updateDocumentStyleProfileMock;

    try {
      const result = await updateProfile.execute(
        createStepParams({
          getAgent: (agentId: string) =>
            agentId === "documentProfileAgent" ? agent : undefined,
        }),
      );

      expect(result).toEqual({
        suggestions: createDocumentInput().suggestions,
        cleanPatterns: createDocumentInput().cleanPatterns,
      });
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

  it("fails when the document profile agent is missing", async () => {
    await expect(
      updateProfile.execute(
        createStepParams({
          getAgent: () => undefined,
        }),
      ),
    ).rejects.toThrow("Document profile agent not found");
  });
});
