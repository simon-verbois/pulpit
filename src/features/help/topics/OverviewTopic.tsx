import { Content } from "@patternfly/react-core";

export function OverviewTopic() {
  return (
    <Content>
      <Content component="p">
        Size and repository-count totals are refreshed periodically in the background and
        read instantly from a cache - they cover the whole Pulp instance, not just what
        your own account can see, and repository sizes cover the latest version. A dash
        means no total has been cached yet (or the last refresh failed), not that the
        repository is empty.
      </Content>
      <Content component="p">
        The cards at the top summarize live infrastructure health. Colored status labels
        always include text, so you never need to rely on color alone. The component table
        links repository totals to the corresponding repository page, while the System
        task log opens any listed operation directly in the full task view.
      </Content>
      <Content component="p">
        PulpIT is where you manage the content on your Pulp server: repositories,
        packages, remotes, and more. Nothing is stored in PulpIT itself — every page reads
        and writes directly to Pulp, so what you see here always matches what's actually
        on your server.
      </Content>

      <Content component="h3">Checking system health</Content>
      <Content component="p">
        Open <strong>Overview</strong> (the home page) to see whether Pulp is healthy:
        which components are installed and their versions, whether the database and Redis
        are connected, how many workers and content apps are online, and how much storage
        is used. If something here looks wrong (a disconnected database, no online
        workers), fix your Pulp deployment first — PulpIT can't work around a Pulp server
        that isn't running properly.
      </Content>

      <Content component="h3">Finding your way around</Content>
      <Content component="p">
        The left-hand navigation is grouped by content type. <strong>RPM</strong>,{" "}
        <strong>Container</strong>, and <strong>Ansible</strong> each have their own
        Repositories, Remotes, and related pages. <strong>Tasks</strong>,{" "}
        <strong>Access</strong>, and <strong>Administration</strong> apply across all of
        them.
      </Content>

      <Content component="h3">Getting help while you work</Content>
      <Content component="p">
        While a list loads, its column headings and placeholder rows show where the
        results will appear. Placeholders are not repository content or a progress
        estimate; they disappear when the server responds. A failed request shows an error
        with a retry action instead.
      </Content>
      <Content component="p">
        Click <strong>Helper</strong> in the top bar any time — it opens on the topic for
        whatever page you're currently on. Use the list on the left to jump to a different
        topic.
      </Content>
    </Content>
  );
}
