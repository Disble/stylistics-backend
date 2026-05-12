/**
 * Provides deterministic helpers for profile-markdown analysis while keeping the
 * workflow step itself focused on orchestration.
 */

const CORRECTION_PATTERNS_SECTION_HEADING = "## PATRONES VIVOS";
const TOP_LEVEL_SECTION_PATTERN = /^##\s+/gm;
const WORD_PATTERN = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;

/**
 * Extracts the markdown body that belongs to the living-patterns section. The
 * heading itself is excluded so the count reflects stored correction patterns,
 * not structural markdown.
 */
export function extractProfileCorrectionPatternsSection(
  profileMarkdown: string,
) {
  const correctionPatternsHeadingIndex = profileMarkdown.indexOf(
    CORRECTION_PATTERNS_SECTION_HEADING,
  );

  if (correctionPatternsHeadingIndex === -1) {
    return "";
  }

  const sectionBodyStartIndex =
    correctionPatternsHeadingIndex + CORRECTION_PATTERNS_SECTION_HEADING.length;
  TOP_LEVEL_SECTION_PATTERN.lastIndex = sectionBodyStartIndex;

  const nextTopLevelSectionMatch =
    TOP_LEVEL_SECTION_PATTERN.exec(profileMarkdown);
  const sectionBodyEndIndex =
    nextTopLevelSectionMatch?.index ?? profileMarkdown.length;

  return profileMarkdown
    .slice(sectionBodyStartIndex, sectionBodyEndIndex)
    .trim();
}

/** Counts words in the persisted living correction-patterns layer deterministically. */
export function countProfileCorrectionPatternsWords(profileMarkdown: string) {
  return (
    extractProfileCorrectionPatternsSection(profileMarkdown).match(WORD_PATTERN)
      ?.length ?? 0
  );
}
