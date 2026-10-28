import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, cpSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { loadReleaseNotes, parseChangelog, prepareRelease } from "./changelog.mjs";

const NOTES = `# Changelog

## Unreleased

### Added

- New **release** popup with a [version selector](https://example.org).
  Works with \`localStorage\` disabled too.

## 2026.44.5 — 2026-10-28

### Fixed

- No redundant publish jobs.
`;

describe("bundled changelog", () => {
  it("excludes Unreleased and unfolds Markdown into readable plain text", () => {
    const next = prepareRelease(NOTES, "2026.44.6", "2026-10-29");
    const releases = loadReleaseNotes(next, "2026.44.6");
    expect(releases.map((release) => release.version)).toEqual([
      "2026.44.6",
      "2026.44.5",
    ]);
    expect(releases[0].sections[0].entries).toEqual([
      "New release popup with a version selector. Works with localStorage disabled too.",
    ]);
    expect(parseChangelog(NOTES)).toHaveLength(1);
    expect(next).toContain("## Unreleased\n\n## 2026.44.6 — 2026-10-29");
  });

  it("refuses a build without release notes for the running version", () => {
    expect(() => loadReleaseNotes(NOTES, "2026.44.6")).toThrow(
      /must contain non-empty notes/,
    );
    expect(() => loadReleaseNotes("## 2026.44.5 — 2026-10-28\n", "2026.44.5")).toThrow();
  });

  it("does not ship future releases in an older build", () => {
    const next = prepareRelease(NOTES, "2026.44.6", "2026-10-29");
    expect(loadReleaseNotes(next, "2026.44.5").map((release) => release.version)).toEqual(
      ["2026.44.5"],
    );
  });

  it("rejects undocumented, duplicated and malformed releases", () => {
    expect(() =>
      prepareRelease(
        NOTES.replace(/- New[\s\S]*?\n\n##/, "##"),
        "2026.44.6",
        "2026-10-29",
      ),
    ).toThrow(/Unreleased/);
    expect(() => prepareRelease(NOTES, "2026.44.5", "2026-10-29")).toThrow(
      /already contains/,
    );
    expect(() => prepareRelease(NOTES, "bad", "2026-10-29")).toThrow(/Invalid release/);
    expect(() => parseChangelog(`${NOTES}\n## 2026.44.5 — 2026-10-28\n`)).toThrow(
      /Duplicate/,
    );
    expect(() => parseChangelog("## 2026.44.5\n")).toThrow(/Invalid changelog/);
  });
});

it("release.sh publishes VERSION and its notes together and refuses a second undocumented release", () => {
  const directory = mkdtempSync(join(tmpdir(), "pulpit-release-test-"));
  const remote = join(directory, "remote.git");
  const repo = join(directory, "repo");
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd: repo, stdio: "pipe" }).toString().trim();
  try {
    execFileSync("git", ["init", "--bare", remote], { stdio: "pipe" });
    execFileSync("git", ["init", "-b", "main", repo], { stdio: "pipe" });
    cpSync(resolve("scripts"), join(repo, "scripts"), { recursive: true });
    writeFileSync(join(repo, "VERSION"), "2026.44.5\n");
    writeFileSync(join(repo, "CHANGELOG.md"), NOTES);
    git("config", "user.name", "Release test");
    git("config", "user.email", "release@example.invalid");
    git("remote", "add", "origin", remote);
    git("add", ".");
    git("commit", "-m", "Initial test sources");
    execFileSync("bash", ["scripts/release.sh"], { cwd: repo, stdio: "pipe" });
    const version = readFileSync(join(repo, "VERSION"), "utf8").trim();
    const notes = readFileSync(join(repo, "CHANGELOG.md"), "utf8");
    expect(loadReleaseNotes(notes, version)[0].version).toBe(version);
    expect(git("status", "--porcelain")).toBe("");
    expect(git("ls-remote", "origin", `refs/tags/${version}`)).toContain(
      `refs/tags/${version}`,
    );
    const head = git("rev-parse", "HEAD");
    expect(() =>
      execFileSync("bash", ["scripts/release.sh"], { cwd: repo, stdio: "pipe" }),
    ).toThrow();
    expect(git("rev-parse", "HEAD")).toBe(head);
    expect(git("status", "--porcelain")).toBe("");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
