import { Content } from "@patternfly/react-core";

export function ContainersOverviewTopic() {
  return (
    <Content>
      <Content component="p">
        Use this area to manage container image content: repositories, the tags/manifests
        they hold, and the remotes you sync from.
      </Content>
      <Content component="p">
        Unlike RPM, there is no separate publish step and no publication concept at all —
        a repository's content becomes pullable as soon as it has a distribution. There is
        also a second, distinct "container-push" repository flavor that{" "}
        <code>docker</code>/<code>podman push</code> creates automatically, which this
        area does not manage.
      </Content>
      <Content component="p">
        Pick <strong>Repositories</strong> to sync/create/delete repositories and manage
        one repository's tags, manifests, versions, and distributions;{" "}
        <strong>Tags</strong> to browse every tag across every repository at once; or{" "}
        <strong>Remotes</strong> to configure where content is synced from.
      </Content>
    </Content>
  );
}
