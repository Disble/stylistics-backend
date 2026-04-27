/**
 * Validates workspace-root discovery and author-profile loading for the
 * stylistic workflow after the Mastra colocation refactor.
 */
import { describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  countAuthorProfileObservationsCharacters,
  extractAuthorProfileObservationsSection,
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
      "### Preferencias\n- Usa frases cortas.",
      "utf8",
    );

    const profile = await withWorkingDirectory(tempDirectoryPath, () =>
      loadAuthorProfileText("disble"),
    );

    expect(profile).toContain("### Preferencias");
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
      "### Preferencias\n- Perfil desde backend hijo.",
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

describe("author profile observations metrics", () => {
  it("extracts only the observations section body", () => {
    const expectedObservationsSection = [
      "### Lengua",
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
      "## SÍNTESIS DE OBSERVACIONES",
      "- Síntesis compacta.",
      "",
      "## OBSERVACIONES",
      expectedObservationsSection,
      "",
      "## OTRA SECCIÓN",
      "Este bloque no debe contar.",
    ].join("\n");

    expect(extractAuthorProfileObservationsSection(authorProfile)).toBe(
      expectedObservationsSection,
    );
    expect(countAuthorProfileObservationsCharacters(authorProfile)).toBe(
      expectedObservationsSection.length,
    );
  });

  it("returns zero characters when observations section is missing", () => {
    const authorProfile = [
      "# Perfil de Corrección: Disble",
      "",
      "## SÍNTESIS DE OBSERVACIONES",
      "- Síntesis compacta.",
    ].join("\n");

    expect(extractAuthorProfileObservationsSection(authorProfile)).toBe("");
    expect(countAuthorProfileObservationsCharacters(authorProfile)).toBe(0);
  });
});
