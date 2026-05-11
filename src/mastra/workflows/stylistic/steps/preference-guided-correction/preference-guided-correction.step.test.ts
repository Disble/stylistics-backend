import { describe, expect, it, mock } from "bun:test";

import { PgUserPreferencesRepository } from "../../../../../infrastructure/persistence/repositories/user-preferences.repository";
import { preferenceGuidedCorrection } from "./preference-guided-correction.step";

function createBaseInput() {
  return {
    text: "Era tarde y la casa seguia despierta.",
    documentUuid: "44444444-4444-4444-8444-444444444444",
    genero: "narrativa-literaria" as const,
    authorProfile: "Prefiere frases cortas y tensión progresiva.",
    authorProfileCorrectionPatternsWordCount: 42,
    documentContext: {
      documentId: "11111111-1111-4111-8111-111111111111",
      documentStyleProfileId: "22222222-2222-4222-8222-222222222222",
      documentPreferencesId: "33333333-3333-4333-8333-333333333333",
      documentUuid: "44444444-4444-4444-8444-444444444444",
      defaultGenre: "general" as const,
      processingConfig: {},
    },
  };
}

function createRequestContext(userId = "user-123") {
  return {
    get: (key: string) =>
      key === "user"
        ? {
            user: {
              id: userId,
            },
          }
        : undefined,
  };
}

function createStepParams(
  inputData = createBaseInput(),
  mastra?: { getAgent: (id: string) => unknown },
  requestContext = createRequestContext(),
) {
  return {
    inputData,
    mastra,
    runId: "run-id",
    workflowId: "workflow-id",
    requestContext,
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
  } as unknown as Parameters<typeof preferenceGuidedCorrection.execute>[0];
}

describe("preferenceGuidedCorrection step", () => {
  it("passes through with previousCorrection null when the user has no preferences", async () => {
    const originalGetUserPreferences =
      PgUserPreferencesRepository.prototype.getUserPreferences;

    PgUserPreferencesRepository.prototype.getUserPreferences = mock(
      async () => ({
        id: null,
        userId: "user-123",
        correctionInstructions: null,
      }),
    );

    try {
      const result =
        await preferenceGuidedCorrection.execute(createStepParams());

      expect(result).toEqual({
        ...createBaseInput(),
        previousCorrection: null,
      });
    } finally {
      PgUserPreferencesRepository.prototype.getUserPreferences =
        originalGetUserPreferences;
    }
  });

  it("stores a structured previousCorrection when preferences exist", async () => {
    const originalGetUserPreferences =
      PgUserPreferencesRepository.prototype.getUserPreferences;
    let receivedPrompt = "";
    const agent = {
      generate: mock(async (prompt: string) => {
        receivedPrompt = prompt;

        return {
          text: "ok",
          object: {
            suggestions: [
              {
                type: "track-change" as const,
                context: "Era tarde y la casa seguia despierta.",
                anchor: "seguia",
                suggestedText: "seguia",
                justification: "El usuario pidió revisar tildación.",
                category: "ortografia" as const,
                severity: "high" as const,
              },
            ],
            cleanPatterns: ["sin-abuso-de-puntos"],
          },
        };
      }),
    };

    PgUserPreferencesRepository.prototype.getUserPreferences = mock(
      async () => ({
        id: "pref-1",
        userId: "user-123",
        correctionInstructions: "Revisa tildes y abuso de puntos suspensivos.",
      }),
    );

    try {
      const result = await preferenceGuidedCorrection.execute(
        createStepParams(createBaseInput(), {
          getAgent: (agentId: string) =>
            agentId === "stylisticAgent" ? agent : undefined,
        }),
      );

      expect(agent.generate).toHaveBeenCalledTimes(1);
      expect(receivedPrompt).toContain("<preferencias-usuario>");
      expect(receivedPrompt).toContain(
        "Revisa tildes y abuso de puntos suspensivos.",
      );
      expect(result.previousCorrection).toEqual({
        suggestions: [
          {
            type: "comment-only",
            context: "Era tarde y la casa seguia despierta.",
            anchor: "seguia",
            justification: "El usuario pidió revisar tildación.",
            category: "ortografia",
            severity: "high",
          },
        ],
        cleanPatterns: ["sin-abuso-de-puntos"],
      });
    } finally {
      PgUserPreferencesRepository.prototype.getUserPreferences =
        originalGetUserPreferences;
    }
  });
});
