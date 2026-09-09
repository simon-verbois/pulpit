/**
 * The pulpcore/plugin versions each of this app's feature areas was last
 * VERIFIED live against (docs/ROADMAP.md, per-milestone "VERIFIED against a
 * live pulpcore X.Y.Z / plugin A.B.C instance" notes). Not every reported
 * status component has an entry - only the ones Pulpit has a UI for.
 *
 * Shown as a plain reference in PulpStatusSummary's Component/Version
 * table - deliberately not used to generate any "newer version"/"not
 * tested" warning (removed by request: a running instance being ahead of
 * this baseline is normal and not worth surfacing as an issue).
 */
export const VERIFIED_VERSIONS: Record<string, string> = {
  core: "3.116.0",
  rpm: "3.38.5",
  ansible: "0.30.0",
  container: "2.29.0",
  // Ships bundled inside pulpcore itself (module pulp_file.app, package
  // pulpcore - VERIFIED live), not a separate plugin package like the
  // others above - hence tracking pulpcore's own version here.
  file: "3.116.1",
  deb: "3.10.0",
  python: "3.35.0",
  npm: "0.10.1",
  gem: "0.8.0",
  maven: "0.25.1",
  hugging_face: "0.3.2",
};
