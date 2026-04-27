/**
 * Validates workspace-root discovery and author-profile loading for the
 * stylistic workflow after the Mastra colocation refactor.
 */
import { describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  countAuthorProfileCorrectionPatternsWords,
  extractAuthorProfileCorrectionPatternsSection,
  loadAuthorProfileText,
  loadRequiredAuthorProfileText,
  resolveAuthorProfilePath,
  resolveWorkspaceRoot,
} from "./load-author-profile.helpers";

async function withWorkingDirectory<T>(
  directoryPath: string,
  callback: () => Promise<T>,
): Promise<T> {
  const previousWorkingDirectory = process.cwd();
  process.chdir(directoryPath);

  try {
    return await callback();
  } finally {
    process.chdir(previousWorkingDirectory);
  }
}

describe("loadAuthorProfileText", () => {
  it("reads the author profile from the workspace path when it exists", async () => {
    const tempDirectoryPath = await mkdtemp(
      join(tmpdir(), "stylistic-author-profile-"),
    );
    await mkdir(join(tempDirectoryPath, "workspace", "autores"), {
      recursive: true,
    });
    await writeFile(
      join(tempDirectoryPath, "workspace", "autores", "disble.md"),
      "## CRITERIOS DE INTERVENCIÓN\n- Usa frases cortas.",
      "utf8",
    );

    const profile = await withWorkingDirectory(tempDirectoryPath, () =>
      loadAuthorProfileText("disble"),
    );

    expect(profile).toContain("## CRITERIOS DE INTERVENCIÓN");
    expect(profile).toContain("Usa frases cortas.");
  });

  it("returns undefined when the author profile does not exist", async () => {
    const tempDirectoryPath = await mkdtemp(
      join(tmpdir(), "stylistic-author-profile-miss-"),
    );

    const profile = await withWorkingDirectory(tempDirectoryPath, () =>
      loadAuthorProfileText("missing-author"),
    );

    expect(profile).toBeUndefined();
  });

  it("throws when the author profile is required but missing", async () => {
    const tempDirectoryPath = await mkdtemp(
      join(tmpdir(), "stylistic-required-profile-miss-"),
    );

    expect(
      withWorkingDirectory(tempDirectoryPath, () =>
        loadRequiredAuthorProfileText("missing-author"),
      ),
    ).rejects.toThrow("Author profile not found for autorSlug=missing-author");
  });

  it("finds the backend workspace when called from the parent stylistic directory", async () => {
    const tempDirectoryPath = await mkdtemp(
      join(tmpdir(), "stylistic-parent-root-"),
    );
    const backendRoot = join(tempDirectoryPath, "stylistics-backend");

    await mkdir(join(backendRoot, "workspace", "autores"), {
      recursive: true,
    });
    await writeFile(
      join(backendRoot, "workspace", "autores", "disble.md"),
      "## CRITERIOS DE INTERVENCIÓN\n- Perfil desde backend hijo.",
      "utf8",
    );

    const resolvedWorkspaceRoot = await withWorkingDirectory(
      tempDirectoryPath,
      async () => resolveWorkspaceRoot(),
    );
    const resolvedProfilePath = await withWorkingDirectory(
      tempDirectoryPath,
      async () => resolveAuthorProfilePath("disble"),
    );
    const profile = await withWorkingDirectory(tempDirectoryPath, () =>
      loadAuthorProfileText("disble"),
    );

    expect(resolvedWorkspaceRoot).toBe(backendRoot);
    expect(resolvedProfilePath).toBe(
      join(backendRoot, "workspace", "autores", "disble.md"),
    );
    expect(profile).toContain("Perfil desde backend hijo.");
  });
});

describe("author profile correction-pattern metrics", () => {
  it("extracts only the living correction-patterns section body", () => {
    const expectedCorrectionPatternsSection = [
      "### Gramática",
      "- 🔴 Concordancia: mantiene desajustes de número entre sujeto y verbo.",
      "",
      "### Estilo",
      "- 🟡 Ritmo: sostiene frases extensas donde la escena pide respiración.",
    ].join("\n");
    const authorProfile = [
      "---",
      "autor: Disble",
      "---",
      "# Perfil de Corrección: Disble",
      "",
      "## PATRONES VIVOS",
      expectedCorrectionPatternsSection,
      "",
      "## CRITERIOS DE INTERVENCIÓN",
      "Este bloque no debe contar.",
    ].join("\n");

    expect(extractAuthorProfileCorrectionPatternsSection(authorProfile)).toBe(
      expectedCorrectionPatternsSection,
    );
    expect(countAuthorProfileCorrectionPatternsWords(authorProfile)).toBe(20);
  });

  it("returns zero words when living correction-patterns section is missing", () => {
    const authorProfile = [
      "# Perfil de Corrección: Disble",
      "",
      "## CRITERIOS DE INTERVENCIÓN",
      "- No corregir un rasgo declarado.",
    ].join("\n");

    expect(extractAuthorProfileCorrectionPatternsSection(authorProfile)).toBe(
      "",
    );
    expect(countAuthorProfileCorrectionPatternsWords(authorProfile)).toBe(0);
  });
});
