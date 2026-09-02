import { Content } from "@patternfly/react-core";

export function AnsibleSearchTopic() {
  return (
    <Content>
      <Content component="p">
        Finds a collection version across <strong>every</strong> Ansible repository at
        once, without picking a repository first — useful once you have more than a couple
        of repositories and don't remember which one holds a given collection.
      </Content>
      <Content component="p">
        Each result shows the repository it was found in, plus up to three status labels:{" "}
        <strong>Highest</strong> (the highest version of that collection available
        anywhere), <strong>Signed</strong>, and <strong>Deprecated</strong>.
      </Content>
      <Content component="p">
        This index returns at most one row per collection-version content unit, not one
        row per (repository, version) pair — if the exact same collection tarball was
        synced or uploaded into two repositories, only the repository that first indexed
        it shows up here. Don't rely on this page to find every repository holding a given
        version; check each repository's own <strong>Collections</strong> tab for that.
      </Content>
    </Content>
  );
}
