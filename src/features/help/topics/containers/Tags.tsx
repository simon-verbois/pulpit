import { Content } from "@patternfly/react-core";

export function ContainersTagsTopic() {
  return (
    <Content>
      <Content component="p">
        A read-only view of every container tag across every repository Pulp knows about —
        search by name to find where a specific tag exists without opening each repository
        one by one. Each row shows the tag name, when it was created, and the repositories
        whose current version contains it. Repository names open their detail pages.
      </Content>
      <Content component="p">
        To create or remove a tag, open the repository it belongs to and use its own{" "}
        <strong>Tags</strong> tab — this global page has no <strong>Tag image…</strong> or{" "}
        <strong>Remove</strong> action of its own.
      </Content>
    </Content>
  );
}
