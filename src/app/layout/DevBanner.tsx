import { UiIcon } from "../../components/icons/UiIcon";

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
      aria-label={`Development build — ${__BUILD_DATE__}`}
      title={`Development build — ${__BUILD_DATE__}`}
      className="pulpit-dev-banner"
    >
      <span aria-hidden="true">Development build</span>
      <span aria-hidden="true" className="pulpit-dev-banner-date">
        {` — ${__BUILD_DATE__}`}
      </span>
      <UiIcon name="eye-off" size="1rem" aria-hidden="true" />
    </div>
  );
}
