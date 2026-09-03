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
        The only default configured here today. Once set, every plugin's Create Remote
        form applies it automatically - its <strong>Advanced connection settings</strong>{" "}
        section opens showing <strong>Use the instance default proxy</strong>, checked by
        default. Unchecking it (or editing an existing Remote, which always starts
        unchecked so an existing Remote's own proxy is never silently replaced) reveals
        the normal Proxy URL/username/password fields for a one-off override on that
        Remote only - saving here never touches any already-created Remote.
      </Content>
      <Content component="p">
        The password is write-only, same as every Remote's own proxy password: this page
        shows only whether one is set, never the value itself, and it's encrypted at rest
        by pulpit-core. The decrypted value is only ever read back by the Create/Edit
        Remote form itself, at the moment it actually needs to apply the default.
      </Content>
    </Content>
  );
}
