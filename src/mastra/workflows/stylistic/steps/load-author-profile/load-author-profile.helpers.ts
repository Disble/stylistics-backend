/**
 * Provides filesystem-based author-profile discovery for the stylistic
 * workflow while keeping the workflow step itself focused on orchestration.
 */
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, parse, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MODULE_ROOT = resolve(
  fileURLToPath(new URL("../../../../", import.meta.url)),
);

const OBSERVATIONS_SECTION_HEADING = "## OBSERVACIONES";
const TOP_LEVEL_SECTION_PATTERN = /^##\s+/gm;

/**
 * Returns whether the candidate path exposes the workspace author-profile
 * directory expected by the stylistic workflow.
 */
function hasAuthorProfilesDirectory(basePath: string) {
  return existsSync(resolve(basePath, "workspace", "autores"));
}

/**
 * Walks up from a starting path until it finds a repository root that contains
 * the mounted author-profile workspace.
 */
function walkUpToFindWorkspaceRoot(startPath: string) {
  let currentPath = startPath;

  while (true) {
    if (hasAuthorProfilesDirectory(currentPath)) {
      return currentPath;
    }

    const parentPath = dirname(currentPath);
    if (parentPath === currentPath || parse(currentPath).root === currentPath) {
      return undefined;
    }

    currentPath = parentPath;
  }
}

/**
 * Resolves the repository root that contains the mounted author-profile
 * workspace required by the stylistic workflow.
 */
export function resolveWorkspaceRoot() {
  const candidateBasePaths = [
    process.cwd(),
    resolve(process.cwd(), "stylistics-backend"),
    MODULE_ROOT,
    resolve(MODULE_ROOT, "stylistics-backend"),
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidateBasePath of candidateBasePaths) {
    const discoveredRoot = walkUpToFindWorkspaceRoot(candidateBasePath);

    if (discoveredRoot) {
      return discoveredRoot;
    }

    if (hasAuthorProfilesDirectory(candidateBasePath)) {
      return candidateBasePath;
    }
  }

  return process.cwd();
}

/**
 * Builds the absolute path for one author profile inside the mounted workspace.
 */
export function resolveAuthorProfilePath(autorSlug: string) {
  const workspaceRoot = resolveWorkspaceRoot();
  return resolve(workspaceRoot, "workspace", "autores", `${autorSlug}.md`);
}

/**
 * Reads an author profile if it exists and returns `undefined` on missing-file
 * lookups so callers can decide whether the profile is optional.
 */
export async function loadAuthorProfileText(
  autorSlug: string,
): Promise<string | undefined> {
  const profilePath = resolveAuthorProfilePath(autorSlug);

  try {
    return await readFile(profilePath, "utf8");
  } catch (error) {
    const ioError = error as NodeJS.ErrnoException;

    if (ioError.code === "ENOENT") {
      return undefined;
    }

    throw error;
  }
}

/**
 * Reads an author profile and returns its text plus resolved path, throwing
 * when the workflow cannot continue because the profile is missing.
 */
export async function loadRequiredAuthorProfileText(autorSlug: string) {
  const profilePath = resolveAuthorProfilePath(autorSlug);
  const authorProfile = await loadAuthorProfileText(autorSlug);

  if (authorProfile === undefined) {
    throw new Error(
      `Author profile not found for autorSlug=${autorSlug} at ${profilePath}`,
    );
  }

  return {
    authorProfile,
    authorProfilePath: profilePath,
  };
}

/**
 * Extracts the markdown body that belongs to the author-profile observations
 * section. The heading itself is excluded so the count reflects stored
 * observations, not structural markdown.
 */
export function extractAuthorProfileObservationsSection(authorProfile: string) {
  const observationsHeadingIndex = authorProfile.indexOf(
    OBSERVATIONS_SECTION_HEADING,
  );

  if (observationsHeadingIndex === -1) {
    return "";
  }

  const sectionBodyStartIndex =
    observationsHeadingIndex + OBSERVATIONS_SECTION_HEADING.length;
  TOP_LEVEL_SECTION_PATTERN.lastIndex = sectionBodyStartIndex;

  const nextTopLevelSectionMatch =
    TOP_LEVEL_SECTION_PATTERN.exec(authorProfile);
  const sectionBodyEndIndex =
    nextTopLevelSectionMatch?.index ?? authorProfile.length;

  return authorProfile.slice(sectionBodyStartIndex, sectionBodyEndIndex).trim();
}

/** Counts characters in the persisted observations layer deterministically. */
export function countAuthorProfileObservationsCharacters(
  authorProfile: string,
) {
  return extractAuthorProfileObservationsSection(authorProfile).length;
}
