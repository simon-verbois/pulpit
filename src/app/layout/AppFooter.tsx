import { Content } from "@patternfly/react-core";

const REPOSITORY_URL = "https://github.com/simon-verbois/pulpit";
const CHANGELOG_URL = `${REPOSITORY_URL}/blob/main/CHANGELOG.md`;
const LICENSE_URL = `${REPOSITORY_URL}/blob/main/LICENSE`;
// The release workflow tags the public mirror with the exact VERSION value
// (.forgejo/workflows/release.yml "Verify release version") - this always
// points at the tag build that shipped, not just the moving repo root.
const RELEASE_URL = `${REPOSITORY_URL}/tree/${__APP_VERSION__}`;

// Bottom-of-page build identifier: the VERSION file's content, baked in at
// build time (vite.config.ts). Fixed to the viewport's bottom edge, plain
// text with no card/background - PatternFly's Page <main> is a flex column
// with no definite height to grow into (it sits inside Page's own Drawer
// wrapper here, see AppLayout.tsx), so a normal in-flow element only ever
// lands directly below the page content, not at the bottom of the screen,
// on a page short enough to not fill the viewport (e.g. Overview).
// `pointer-events: none` on the wrapper keeps this from blocking clicks on
// whatever page content happens to scroll underneath it; only the link
// itself (the one interactive part) re-enables them.
export function AppFooter() {
  return (
    <div
      style={{
        position: "fixed",
        insetInlineStart: 0,
        insetInlineEnd: 0,
        bottom: 0,
        textAlign: "center",
        padding: "1rem",
        pointerEvents: "none",
      }}
    >
      <Content
        component="small"
        style={{ color: "var(--pf-t--global--text--color--200)" }}
      >
        <a
          href={RELEASE_URL}
          target="_blank"
          rel="noreferrer"
          style={{ pointerEvents: "auto" }}
        >
          {__APP_VERSION__}
        </a>{" "}
        —{" "}
        <a
          href={CHANGELOG_URL}
          target="_blank"
          rel="noreferrer"
          style={{ pointerEvents: "auto" }}
        >
          Changelog
        </a>{" "}
        —{" "}
        <a
          href={LICENSE_URL}
          target="_blank"
          rel="noreferrer"
          style={{ pointerEvents: "auto" }}
        >
          MIT License
        </a>
      </Content>
    </div>
  );
}
