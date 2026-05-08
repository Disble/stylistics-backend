import { describe, expect, it, mock } from "bun:test";

import { applyDocumentFeedback } from "./apply-document-feedback";

describe("applyDocumentFeedback", () => {
  it("persists the updated markdown when the agent returns an updated result", async () => {
    const generate = mock(async () => ({
      object: {
        status: "updated",
        decisionSummary: "Added one explicit intervention criterion.",
        profileMarkdown: "# Updated profile",
      },
    }));

    const updateDocumentStyleProfile = mock(async () => undefined);

    const result = await applyDocumentFeedback(
      {
        documentStyleProfileId: "22222222-2222-4222-8222-222222222222",
        currentProfileMarkdown: "# Current profile",
        category: "estilo",
        context: "Full paragraph context.",
        anchor: "target text",
        suggestedText: "replacement text",
        justification: "Original correction justification.",
        action: "reject",
        severity: "medium",
        suggestionType: "track-change",
        comment: "Please keep this rhythm.",
      },
      {
        agent: { generate },
        repository: { updateDocumentStyleProfile },
      },
    );

    expect(result).toEqual({
      status: "updated",
      decisionSummary: "Added one explicit intervention criterion.",
      profileMarkdown: "# Updated profile",
    });

    expect(updateDocumentStyleProfile).toHaveBeenCalledWith({
      documentStyleProfileId: "22222222-2222-4222-8222-222222222222",
      profileMarkdown: "# Updated profile",
    });
  });

  it("skips persistence when the agent ignores the feedback", async () => {
    const generate = mock(async () => ({
      object: {
        status: "ignored",
        decisionSummary: "Ignored because the comment is contextual only.",
      },
    }));

    const updateDocumentStyleProfile = mock(async () => undefined);

    const result = await applyDocumentFeedback(
      {
        documentStyleProfileId: "22222222-2222-4222-8222-222222222222",
        currentProfileMarkdown: "# Current profile",
        category: "estilo",
        context: "Full paragraph context.",
        anchor: "target text",
        justification: "Original correction justification.",
        action: "accept",
        severity: "low",
        suggestionType: "comment-only",
        comment: "Only for this paragraph.",
      },
      {
        agent: { generate },
        repository: { updateDocumentStyleProfile },
      },
    );

    expect(result).toEqual({
      status: "ignored",
      decisionSummary: "Ignored because the comment is contextual only.",
    });
    expect(updateDocumentStyleProfile).not.toHaveBeenCalled();
  });
});
