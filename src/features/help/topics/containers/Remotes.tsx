import { Content } from "@patternfly/react-core";

export function ContainersRemotesTopic() {
  return (
    <Content>
      <Content component="p">
        A remote tells Pulp where to sync container image content from and how. Container
        remotes have two separate location fields, unlike RPM/Ansible remotes which only
        need one URL: <strong>Registry URL</strong> is the registry itself (e.g.{" "}
        <code>https://registry.hub.docker.com</code>), and{" "}
        <strong>Upstream image name</strong> is the specific image on that registry (e.g.{" "}
        <code>library/busybox</code>).
      </Content>

      <Content component="h3">Sync policy</Content>
      <Content component="p">
        <strong>Immediate</strong> downloads all metadata and content now;{" "}
        <strong>On demand</strong> downloads content only when a client actually requests
        it; <strong>Streamed</strong> never stores content locally at all, re-fetching
        from upstream on every request.
      </Content>

      <Content component="h3">Limiting what gets synced</Content>
      <Content component="p">
        <strong>Include tags</strong> takes comma-separated glob patterns (e.g.{" "}
        <code>latest, v1.*</code>) — leave it empty to sync every tag the upstream image
        has. This matters in practice: some registries rate-limit large, unfiltered syncs.
      </Content>

      <Content component="h3">Proxy and registry authentication</Content>
      <Content component="p">
        Expand <strong>Advanced connection settings</strong> to set a proxy
        URL/credentials or credentials for a private upstream registry. Once saved, PulpIT
        only shows whether a password is currently set, never the value itself — leave a
        field blank when editing to keep the existing one, or type a new value to replace
        it.
      </Content>
    </Content>
  );
}
