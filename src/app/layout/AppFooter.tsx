import { Bullseye, Content, PageSection } from "@patternfly/react-core";

const REPOSITORY_URL = "https://github.com/simon-verbois/pulpit";

// Bottom-of-page build identifier: the VERSION file's content, baked in at
// build time (vite.config.ts), linked to the project's public repository.
export function AppFooter() {
  return (
    <PageSection variant="secondary" hasShadowTop>
      <Bullseye>
        <Content component="small">
          Pulpit{" "}
          <a href={REPOSITORY_URL} target="_blank" rel="noreferrer">
            {__APP_VERSION__}
          </a>
        </Content>
      </Bullseye>
    </PageSection>
  );
}
