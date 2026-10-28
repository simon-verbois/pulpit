import { Content } from "@patternfly/react-core";

export function AdministrationRepositorySigningTopic() {
  return (
    <Content>
      <Content component="p">
        Sign RPM packages and repository metadata so clients can verify them.
      </Content>
      <Content component="ol">
        <Content component="li">Enable the signing options you need.</Content>
        <Content component="li">
          Choose <strong>Generate key</strong>, set its validity and optionally enable
          automatic rotation.
        </Content>
        <Content component="li">
          The first key becomes active automatically. For a replacement, use{" "}
          <strong>Publish now</strong> or wait for automatic rotation.
        </Content>
        <Content component="li">
          Copy the public key URL into your client configuration. Clients must trust the
          new key after a replacement.
        </Content>
      </Content>
      <Content component="p">
        <strong>Publishing a replacement key re-signs existing content.</strong> This can
        take a long time.
      </Content>
      <Content component="p">
        Use <strong>Sign all repositories…</strong> to apply signing to existing
        repositories. Package re-signing needs a distribution. Checks that find everything
        already signed do not republish.
      </Content>
      <Content component="p">
        Use <strong>Extend expiration</strong> to keep the same key longer. If a
        manual-step banner appears, follow its displayed instructions.
      </Content>
    </Content>
  );
}
