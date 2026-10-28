import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const VERSION_PATTERN = /^\d{4}\.\d{1,2}\.[1-9]\d*$/;

// The changelog deliberately uses only headings and wrapped bullet lists.
// Render its text as React text nodes, never as HTML from the Markdown file.
function plainText(text) {
  return text
    .replace(/\[([^\]]+)\]\([^\s)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .trim();
}

export function parseChangelog(markdown) {
  const releases = [];
  let release;
  let section;
  for (const line of markdown.split(/\r?\n/)) {
    if (line.startsWith("## ")) {
      const match = /^## (\d{4}\.\d{1,2}\.[1-9]\d*) — (\d{4}-\d{2}-\d{2})$/.exec(line);
      release = match ? { version: match[1], date: match[2], sections: [] } : undefined;
      section = undefined;
      if (release) {
        if (releases.some((entry) => entry.version === release.version)) {
          throw new Error(`Duplicate changelog version: ${release.version}`);
        }
        releases.push(release);
      } else if (line !== "## Unreleased") {
        throw new Error(`Invalid changelog release heading: ${line}`);
      }
      continue;
    }
    if (!release || !line.trim()) {
      continue;
    }
    if (line.startsWith("### ")) {
      section = { title: line.slice(4).trim(), entries: [] };
      release.sections.push(section);
    } else if (line.startsWith("- ")) {
      if (!section) {
        section = { title: "Highlights", entries: [] };
        release.sections.push(section);
      }
      section.entries.push(plainText(line.slice(2)));
    } else if (/^\s+\S/.test(line) && section?.entries.length) {
      const index = section.entries.length - 1;
      section.entries[index] += ` ${plainText(line)}`;
    } else {
      if (!section) {
        section = { title: "Highlights", entries: [] };
        release.sections.push(section);
      }
      section.entries.push(plainText(line));
    }
  }
  return releases;
}

export function loadReleaseNotes(markdown, version) {
  const releases = parseChangelog(markdown);
  const current = releases.find((release) => release.version === version);
  if (!current?.sections.some((section) => section.entries.length)) {
    throw new Error(`CHANGELOG.md must contain non-empty notes for VERSION ${version}.`);
  }
  // A build must never announce a release newer than its own VERSION.
  const compare = (a, b) => {
    const left = a.split(".").map(Number);
    const right = b.split(".").map(Number);
    return left[0] - right[0] || left[1] - right[1] || left[2] - right[2];
  };
  return releases.filter((release) => compare(release.version, version) <= 0);
}

export function prepareRelease(markdown, version, date) {
  if (!VERSION_PATTERN.test(version)) {
    throw new Error(`Invalid release version: ${version}`);
  }
  const unreleased = /^## Unreleased\r?\n([\s\S]*?)(?=^## |$(?![\s\S]))/m.exec(markdown);
  if (!unreleased || !/^- \S/m.test(unreleased[1])) {
    throw new Error(
      "Add release notes under ## Unreleased in CHANGELOG.md before releasing.",
    );
  }
  if (parseChangelog(markdown).some((release) => release.version === version)) {
    throw new Error(`Changelog already contains version ${version}.`);
  }
  const next = markdown.replace(
    unreleased[0],
    `## Unreleased\n\n## ${version} — ${date}\n${unreleased[1]}`,
  );
  loadReleaseNotes(next, version);
  return next;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const markdown = readFileSync("CHANGELOG.md", "utf8");
    if (process.argv[2] === "release") {
      const next = prepareRelease(markdown, process.argv[3], process.argv[4]);
      writeFileSync("CHANGELOG.md", next);
      writeFileSync("VERSION", `${process.argv[3]}\n`);
    } else {
      const version = readFileSync("VERSION", "utf8").trim();
      const releases = loadReleaseNotes(markdown, version);
      console.log(`Changelog verified: ${version}, ${releases.length} bundled releases.`);
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
