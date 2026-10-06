import { Content } from "@patternfly/react-core";

export function RpmRemotesTopic() {
  return (
    <Content>
      <Content component="p">
        A remote is an external RPM source (a yum/dnf repository URL) that a repository
        can sync from. Use the <strong>Standard</strong>/<strong>ULN</strong> toggle to
        switch between the two kinds this page manages - they're different Pulp objects,
        not just a style choice.
      </Content>

      <Content component="h3">Standard remotes</Content>
      <Content component="p">
        <strong>Create remote</strong> needs a <strong>Name</strong> and a{" "}
        <strong>URL</strong> (the yum/dnf repository root). <strong>Sync policy</strong>{" "}
        controls how much content is actually downloaded up front:
      </Content>
      <Content component="ul">
        <Content component="li">
          <strong>Immediate</strong> - download all content now.
        </Content>
        <Content component="li">
          <strong>On demand</strong> - download content only when a client actually
          requests it. Required if you want to use this remote as an{" "}
          <strong>Alternate Content Source</strong>.
        </Content>
        <Content component="li">
          <strong>Streamed</strong> - never store content locally at all.
        </Content>
      </Content>
      <Content component="p">
        Expand <strong>Advanced connection settings</strong> to set origin server
        credentials for sources that need them. Proxy, TLS validation and trusted CA
        certificates are managed in Administration → Global Proxy Settings. Once saved,
        this page only shows whether a password is currently set, never the value itself -
        leave a field blank when editing to keep the existing one, or type a new value to
        replace it. <strong>Edit</strong> changes any of these fields, including the sync
        policy; <strong>Delete</strong> removes the remote (repositories that used it as
        their default keep working, just without one).
      </Content>

      <Content component="h3">ULN remotes</Content>
      <Content component="p">
        For Oracle's ULN network instead of an ordinary yum/dnf URL.{" "}
        <strong>Create ULN remote</strong> needs the <strong>Channel URL</strong> (e.g.{" "}
        <code>uln://el7_x86_64_oracle_ksplice</code>), the{" "}
        <strong>ULN server base URL</strong>, and - unlike a standard remote, where
        they're optional - a <strong>username</strong> and <strong>password</strong> are
        required when creating the remote. Use <strong>Edit</strong> to change the
        channel, server, name, or credentials later. Existing credentials are never
        displayed; leave either credential blank while editing to keep its saved value.
      </Content>
    </Content>
  );
}
