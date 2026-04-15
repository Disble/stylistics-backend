import { describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  loadAuthorProfileText,
  loadRequiredAuthorProfileText,
  resolveAuthorProfilePath,
  resolveWorkspaceRoot,
} from "./load-author-profile.helpers";

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

    const profile = await loadAuthorProfileText("disble", tempDirectoryPath);

    expect(profile).toContain("### Preferencias");
    expect(profile).toContain("Usa frases cortas.");
  });

  it("returns undefined when the author profile does not exist", async () => {
    const tempDirectoryPath = await mkdtemp(
      join(tmpdir(), "stylistic-author-profile-miss-"),
    );

    const profile = await loadAuthorProfileText(
      "missing-author",
      tempDirectoryPath,
    );

    expect(profile).toBeUndefined();
  });

  it("throws when the author profile is required but missing", async () => {
    const tempDirectoryPath = await mkdtemp(
      join(tmpdir(), "stylistic-required-profile-miss-"),
    );

    expect(
      loadRequiredAuthorProfileText("missing-author", tempDirectoryPath),
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

    const resolvedWorkspaceRoot = resolveWorkspaceRoot(tempDirectoryPath);
    const resolvedProfilePath = resolveAuthorProfilePath(
      "disble",
      tempDirectoryPath,
    );
    const profile = await loadAuthorProfileText("disble", tempDirectoryPath);

    expect(resolvedWorkspaceRoot).toBe(backendRoot);
    expect(resolvedProfilePath).toBe(
      join(backendRoot, "workspace", "autores", "disble.md"),
    );
    expect(profile).toContain("Perfil desde backend hijo.");
  });
});
