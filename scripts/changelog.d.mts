import type { ReleaseNotes } from "../src/app/releases/types";

export function parseChangelog(markdown: string): ReleaseNotes[];
export function loadReleaseNotes(markdown: string, version: string): ReleaseNotes[];
export function prepareRelease(markdown: string, version: string, date: string): string;
