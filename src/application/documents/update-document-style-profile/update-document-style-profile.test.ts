import { describe, expect, it, mock } from "bun:test";

import { updateDocumentStyleProfile } from "./update-document-style-profile";

describe("updateDocumentStyleProfile", () => {
  it("persists the structured markdown returned by the agent", async () => {
    const repository = {
      updateDocumentStyleProfile: mock(async () => undefined),
    };
    const agent = {
      generate: mock(async () => ({
        text: "ignored",
        object: {
          profileMarkdown: "# Updated profile",
          changeSummary: "Merged duplicate punctuation patterns.",
        },
      })),
    };

    const result = await updateDocumentStyleProfile(
      {
        documentStyleProfileId: "11111111-1111-4111-8111-111111111111",
        currentProfileMarkdown: "# Current profile",
        correctionPatternsWordCount: 42,
        suggestions: [
          {
            type: "comment-only",
            context: "Sample context",
            anchor: "Sample",
            justification: "Clarify punctuation.",
            category: "puntuacion",
            severity: "medium",
          },
        ],
        cleanPatterns: ["uses-en-dash-correctly"],
      },
      { agent, repository },
    );

    expect(result.profileMarkdown).toBe("# Updated profile");
    expect(repository.updateDocumentStyleProfile).toHaveBeenCalledWith({
      documentStyleProfileId: "11111111-1111-4111-8111-111111111111",
      profileMarkdown: "# Updated profile",
    });
  });

  it("fails when the agent does not return structured output", async () => {
    const repository = {
      updateDocumentStyleProfile: mock(async () => undefined),
    };
    const agent = {
      generate: mock(async () => ({
        text: "no structured object",
      })),
    };

    await expect(
      updateDocumentStyleProfile(
        {
          documentStyleProfileId: "11111111-1111-4111-8111-111111111111",
          currentProfileMarkdown: "# Current profile",
          correctionPatternsWordCount: 42,
          suggestions: [],
          cleanPatterns: [],
        },
        { agent, repository },
      ),
    ).rejects.toThrow(
      "Document profile agent did not return structured output.",
    );
  });
});
