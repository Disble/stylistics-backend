import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, parse, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MODULE_ROOT = resolve(
  fileURLToPath(new URL("../../../../", import.meta.url)),
);

function hasAuthorProfilesDirectory(basePath: string) {
  return existsSync(resolve(basePath, "workspace", "autores"));
}

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
 * Resolves the repository root that contains the mounted author profiles folder.
 */
export function resolveWorkspaceRoot(basePath?: string) {
  const normalizedBasePath = basePath ? resolve(basePath) : undefined;
  const candidateBasePaths = [
    normalizedBasePath,
    normalizedBasePath
      ? resolve(normalizedBasePath, "stylistics-backend")
      : undefined,
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

  return normalizedBasePath ?? process.cwd();
}

/**
 * Builds the absolute path for the requested author profile.
 */
export function resolveAuthorProfilePath(autorSlug: string, basePath?: string) {
  const workspaceRoot = resolveWorkspaceRoot(basePath);
  return resolve(workspaceRoot, "workspace", "autores", `${autorSlug}.md`);
}

/**
 * Reads the author profile if it exists.
 */
export async function loadAuthorProfileText(
  autorSlug: string,
  basePath?: string,
): Promise<string | undefined> {
  const profilePath = resolveAuthorProfilePath(autorSlug, basePath);

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
 * Reads the author profile and throws when it is missing.
 */
export async function loadRequiredAuthorProfileText(
  autorSlug: string,
  basePath?: string,
) {
  const profilePath = resolveAuthorProfilePath(autorSlug, basePath);
  const authorProfile = await loadAuthorProfileText(autorSlug, basePath);

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
