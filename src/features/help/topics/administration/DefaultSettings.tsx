import { Content } from "@patternfly/react-core";

export function AdministrationDefaultSettingsTopic() {
  return (
    <Content>
      <Content component="p">
        Instance-wide defaults PulpIT itself keeps track of - stored in pulpit-core's own
        database, never sent to Pulp as a setting of its own (Pulp has no concept of a
        global proxy; each Remote has its own <strong>Proxy URL</strong>/username/password
        under its Create/Edit form's advanced connection settings).
      </Content>

      <Content component="h3">Proxy</Content>
      <Content component="p">
        Once set, every plugin's Create Remote form applies it automatically - its{" "}
        <strong>Advanced connection settings</strong> section opens showing{" "}
        <strong>Use the instance default proxy</strong>, checked by default. Unchecking it
        (or editing an existing Remote, which always starts unchecked so an existing
        Remote's own proxy is never silently replaced) reveals the normal Proxy
        URL/username/password fields for a one-off override on that Remote only - saving
        here never touches any already-created Remote.
      </Content>
      <Content component="p">
        The password is write-only, same as every Remote's own proxy password: this page
        shows only whether one is set, never the value itself, and it's encrypted at rest
        by pulpit-core. The decrypted value is only ever read back by the Create/Edit
        Remote form itself, at the moment it actually needs to apply the default.
      </Content>
      <Content component="p">
        <strong>Skip TLS certificate validation</strong> is applied the same way. Pulp has
        one TLS-validation flag per Remote, shared by the proxy connection and the origin
        server - there's no way to relax it for only the proxy while still validating the
        origin, so enabling this here (or per Remote) skips both once applied.
      </Content>

      <Content component="h3">Trusted CA certificates</Content>
      <Content component="p">
        Paste a CA certificate's PEM content and give it a name to have Pulp itself trust
        connections signed by it - most commonly a corporate TLS-inspecting proxy sitting
        in front of every sync. This is separate from{" "}
        <strong>Skip TLS certificate validation</strong> above: that disables checking
        entirely, this instead teaches Pulp to actually trust a specific CA, so validation
        stays on.
      </Content>
      <Content component="p">
        Adding or removing one queues a background job that copies the current full set of
        certificates into Pulp's own OCI-image trust store (
        <code>/etc/pki/ca-trust/source/anchors/</code>, via <code>update-ca-trust</code>)
        - the only mechanism Pulp's container image actually supports for this, there is
        no API field or environment variable Pulp reads instead. That requires the same
        Docker-exec automation described in <strong>Repository Signing</strong>'s "manual
        Pulp step" (<code>docs/signing.md</code>); without it configured, every
        certificate stays <strong>Pending</strong> rather than failing outright, exactly
        like Repository Signing's own automation falls back when unavailable.
      </Content>
    </Content>
  );
}
