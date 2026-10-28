import type { ReleaseNotes } from "./types";

// Keep one copy of the history in the bundle, shared by the selector and body.
export const RELEASE_NOTES: ReleaseNotes[] = __RELEASE_NOTES__;
