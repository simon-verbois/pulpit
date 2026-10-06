import { Content } from "@patternfly/react-core";

export function AdministrationDefaultSettingsTopic() {
  return (
    <Content>
      <Content component="p">
        Configure outgoing Internet connections once in Administration → Global Proxy
        Settings. Existing and new remotes use the same policy, including Oracle ULN
        authentication. Remote forms only retain origin credentials.
      </Content>
      <Content component="h3">Configure the proxy</Content>
      <Content component="ol">
        <li>Enter the proxy URL and its authentication details if required.</li>
        <li>
          For a TLS-inspecting proxy, paste the CA certificate supplied by your network
          administrator into Trusted CA certificate (PEM).
        </li>
        <li>
          Keep TLS certificate validation enabled and select Save. The next outgoing
          connections use the saved configuration; active transfers can finish.
        </li>
        <li>
          Run a remote connection test. A proxy refusal still requires a network rule
          allowing the repository host and its authentication endpoints.
        </li>
      </Content>
      <Content component="p">
        The CA is added alongside public CAs in Pulp and Pulpit, including the container
        trust stores. Applications, ULN login and Git/curl use the global policy. Internal
        Pulp connections and loopback health checks stay direct.
      </Content>
      <Content component="p">
        Changing or clearing the CA updates new connections and removes the previous
        managed CA. Clearing the proxy URL selects direct Internet access. Proxy passwords
        are encrypted in the configuration database and never returned to remote forms. A
        blank password on Save keeps the existing password.
      </Content>
      <Content component="p">
        This requires the matching Pulp and Pulpit images and their shared network-policy
        volume. It configures application containers; it does not configure the host's
        Docker/Podman image pulls or your browser.
      </Content>
    </Content>
  );
}
