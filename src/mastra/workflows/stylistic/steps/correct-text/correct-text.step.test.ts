/**
 * Covers the end-to-end behavior of the colocated correction step, including
 * agent lookup, safety wrapping, and normalization.
 */
import { describe, expect, it } from "bun:test";

import type { StylisticProfileContext } from "../load-author-profile/load-author-profile.types";
import { correctText } from "./correct-text.step";
import type { StylisticAgent } from "./correct-text.types";

/** Shared step input reused across correction-step unit tests. */
const baseInput: StylisticProfileContext = {
  text: "Era tarde y la casa seguia despierta.",
  autorSlug: "disble",
  genero: "narrativa-literaria",
  authorProfilePath: "workspace/autores/disble.md",
  authorProfile: "Prefiere frases cortas y tensión progresiva.",
};

/** Builds a Mastra step-parameter object with the minimum surface needed by the tests. */
function createStepParams(agent?: StylisticAgent) {
  return {
    inputData: baseInput,
    mastra: {
      getAgent: (agentId: string) =>
        agentId === "stylisticAgent" ? agent : undefined,
    },
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
    getInitData: () => baseInput,
    getStepResult: () => undefined,
    suspend: async () => undefined as never,
    bail: () => undefined as never,
    abort: () => undefined,
  } as Parameters<typeof correctText.execute>[0];
}

describe("correctText step", () => {
  it("returns normalized suggestions and clean patterns from the agent output", async () => {
    const agent: StylisticAgent = {
      generate: async () => ({
        object: {
          suggestions: [
            {
              type: "track-change",
              context: "Era tarde y la casa seguia despierta.",
              anchor: "seguia",
              suggestedText: "seguia",
              justification: "Observación editorial sin reemplazo.",
              category: "estilo",
              severity: "low",
            },
          ],
          cleanPatterns: ["frases-breves"],
        },
        text: "ok",
      }),
    };

    const result = await correctText.execute(createStepParams(agent));
    const suggestion = result.suggestions[0];

    expect(result.autorSlug).toBe("disble");
    expect(result.cleanPatterns).toEqual(["frases-breves"]);
    expect(result.suggestions).toHaveLength(1);
    expect(suggestion).toBeDefined();
    expect(suggestion.type).toBe("comment-only");
    expect("suggestedText" in suggestion).toBe(false);
  });

  it("throws when the stylistic agent is not registered", async () => {
    let thrown: unknown;

    try {
      await correctText.execute(createStepParams());
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toBe("Stylistic agent not found");
  });

  it("wraps Google safety blocks with workflow context", async () => {
    const providerError = new Error("agent failed", {
      cause: {
        statusCode: 400,
        name: "GoogleGenerativeAIError",
        message: "Candidate blocked for safety reasons",
        value: {
          promptFeedback: {
            blockReason: "SAFETY",
            safetyRatings: [],
          },
          usageMetadata: {
            promptTokenCount: 12,
            totalTokenCount: 34,
          },
        },
      },
    });
    const agent: StylisticAgent = {
      generate: async () => {
        throw providerError;
      },
    };
    let thrown: unknown;

    try {
      await correctText.execute(createStepParams(agent));
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toContain(
      "Google/Gemini blocked stylistic correction",
    );
    expect((thrown as Error).message).toContain("blockReason=SAFETY");
    expect((thrown as Error).message).toContain("autorSlug=disble");
    expect((thrown as Error).message).toContain("genero=narrativa-literaria");
    expect((thrown as Error).cause).toBe(providerError);
  });

  it("throws when the agent returns no structured output object", async () => {
    const agent: StylisticAgent = {
      generate: async () => ({
        text: "respuesta libre sin objeto",
        finishReason: "stop",
        warnings: [],
        response: {
          modelId: "google/gemini-2.5-pro",
        },
      }),
    };
    let thrown: unknown;

    try {
      await correctText.execute(createStepParams(agent));
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toBe(
      "No output structured received from stylistic agent",
    );
  });
});
