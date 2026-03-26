import { readdir, stat } from "node:fs/promises";
import path from "node:path";

const rootDirectory = process.cwd();
const sourceDirectory = path.join(rootDirectory, "src");
const managedRoots = [
  path.join(sourceDirectory, "application"),
  path.join(sourceDirectory, "domain"),
  path.join(sourceDirectory, "infrastructure"),
  path.join(sourceDirectory, "shared"),
  path.join(sourceDirectory, "lib"),
  path.join(sourceDirectory, "use-cases"),
  path.join(sourceDirectory, "services"),
  path.join(sourceDirectory, "repositories"),
  path.join(sourceDirectory, "providers"),
];
const supportedExtensions = [".ts", ".tsx", ".js", ".mjs", ".cjs"];
const siblingRoleSuffixes = new Set(["helpers", "schemas", "types"]);
const allowedCompoundSuffixes = new Set([
  "helpers",
  "schemas",
  "types",
  "test",
  "spec",
]);

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(entryPath)));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (entry.name.endsWith(".d.ts")) {
      continue;
    }

    if (
      supportedExtensions.some((extension) => entry.name.endsWith(extension))
    ) {
      files.push(entryPath);
    }
  }

  return files;
}

function isManagedFeatureFile(filePath) {
  return managedRoots.some((managedRoot) =>
    filePath.startsWith(`${managedRoot}${path.sep}`),
  );
}

function stripSourceExtension(fileName) {
  const extension = supportedExtensions.find((candidate) =>
    fileName.endsWith(candidate),
  );

  if (!extension) {
    return null;
  }

  return {
    extension,
    stem: fileName.slice(0, -extension.length),
  };
}

async function pathExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!(await pathExists(sourceDirectory))) {
    console.log("No src directory found; skipping file naming check.");
    return;
  }

  const files = await collectFiles(sourceDirectory);
  const errors = [];

  for (const filePath of files) {
    if (!isManagedFeatureFile(filePath)) {
      continue;
    }

    const parsed = stripSourceExtension(path.basename(filePath));

    if (!parsed) {
      continue;
    }

    const parts = parsed.stem.split(".");

    if (parts.length === 1) {
      if (parts[0] === "utils") {
        errors.push(
          `${path.relative(rootDirectory, filePath)}: avoid generic utils filenames in feature modules; use a feature name or a role-suffixed sibling file instead.`,
        );
      }

      continue;
    }

    if (parts.length > 2) {
      errors.push(
        `${path.relative(rootDirectory, filePath)}: use a single role suffix (for example .helpers, .schemas, .types) so sibling files stay grouped around one base feature name.`,
      );
      continue;
    }

    const [baseName, roleSuffix] = parts;

    if (!baseName || !roleSuffix) {
      errors.push(
        `${path.relative(rootDirectory, filePath)}: invalid compound filename.`,
      );
      continue;
    }

    if (!allowedCompoundSuffixes.has(roleSuffix)) {
      errors.push(
        `${path.relative(rootDirectory, filePath)}: unsupported role suffix .${roleSuffix}; prefer .helpers, .schemas, .types, .test, or .spec in managed feature folders.`,
      );
      continue;
    }

    if (!siblingRoleSuffixes.has(roleSuffix)) {
      continue;
    }

    const siblingBaseFile = path.join(
      path.dirname(filePath),
      `${baseName}${parsed.extension}`,
    );

    if (!(await pathExists(siblingBaseFile))) {
      errors.push(
        `${path.relative(rootDirectory, filePath)}: missing sibling base file ${path.relative(rootDirectory, siblingBaseFile)} required by the role-suffixed feature convention.`,
      );
    }
  }

  if (errors.length > 0) {
    console.error("File naming check failed:\n");

    for (const error of errors) {
      console.error(`- ${error}`);
    }

    process.exitCode = 1;
    return;
  }

  console.log(`File naming check passed for ${files.length} source files.`);
}

await main();
