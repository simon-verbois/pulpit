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
        here never touches any already-created Remote by itself.
      </Content>
      <Content component="h3">Apply to existing remotes</Content>
      <Content component="p">
        <strong>Apply to all remotes…</strong> is the one exception: it retroactively
        overwrites every existing Remote, across every plugin, with whatever is currently
        saved above, right now - not just new ones going forward. It's disabled while the
        form has unsaved changes (save first), and always confirms before running, since
        it's irreversible: the previous per-remote proxy values aren't recorded anywhere.
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
      <Content component="p">
        <strong>Trusted CA certificate (PEM)</strong> is Pulp's own native per-Remote{" "}
        <code>ca_cert</code> field - applied the same way as the proxy fields above, and
        just as overridable per Remote. Unlike{" "}
        <strong>Skip TLS certificate validation</strong>, this doesn't disable checking:
        Pulp's downloader trusts this CA <em>in addition to</em> the system's own CA
        bundle, so validation stays on - most commonly needed to trust a corporate
        TLS-inspecting proxy without disabling TLS validation entirely. This is public
        material (unlike the proxy password above), so it's returned in full, not just as
        "set" or "unset".
      </Content>
    </Content>
  );
}
