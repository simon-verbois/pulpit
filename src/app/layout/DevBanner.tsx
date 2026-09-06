/**
 * A loud, centered tab overlaying the top of the masthead - only ever
 * rendered when `VITE_DEV_BANNER` was set at build time (compose-dev.yml's
 * `pulpit` build arg, deployment/docker/Dockerfile), so a locally-built
 * image is never mistaken for the published release (which never sets
 * this build arg). `position: fixed` deliberately, not an in-flow element -
 * it must overlay the masthead, never push <Page> (a fixed 100vh layout)
 * down and cause its own scrollbar. Deliberately a hardcoded vivid red,
 * not one of PatternFly's own muted "danger" status tokens (VERIFIED those
 * resolve to a dark burnt-orange in this theme, not the attention-grabbing
 * color this needs) - this isn't conveying a semantic error state, just an
 * intentionally loud marker. Shows __BUILD_DATE__ (vite.config.ts), not
 * __APP_VERSION__ - answers "how old is this local build", which the
 * version string alone doesn't for an unreleased build.
 */
export function DevBanner() {
  if (!import.meta.env.VITE_DEV_BANNER) {
    return null;
  }
  return (
    <div
      role="status"
      style={{
        position: "fixed",
        insetBlockStart: 0,
        insetInlineStart: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        background: "#e00000",
        color: "#fff",
        fontSize: "1.1rem",
        fontWeight: 700,
        padding: "0.6rem 2rem",
        borderRadius: "0 0 0.75rem 0.75rem",
      }}
    >
      Development build — {__BUILD_DATE__}
    </div>
  );
}
