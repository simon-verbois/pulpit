import { Content } from "@patternfly/react-core";

export function AnsibleNamespacesTopic() {
  return (
    <Content>
      <Content component="p">
        Manages Galaxy namespace profiles — the company/contact/avatar metadata shown for
        a namespace in Galaxy-compatible clients. A namespace profile belongs to one{" "}
        <strong>distribution's</strong> own Galaxy-compatible API, not to Pulpit globally,
        which is why this page starts with a distribution picker rather than a flat list.
      </Content>
      <Content component="p">
        Only distributions that actually have a repository attached appear in the picker —
        a distribution whose repository was deleted after the fact can't serve Galaxy-v3
        content at all, so it's left out rather than shown and then erroring.
      </Content>

      <Content component="h3">Creating and editing a namespace</Content>
      <Content component="p">
        <strong>Create namespace</strong> takes a <strong>Name</strong> (lowercase with
        underscores, matching the collection namespaces it'll be associated with), plus
        optional <strong>Company</strong>, <strong>Email</strong>,{" "}
        <strong>Description</strong>, and an <strong>Avatar</strong> image.{" "}
        <strong>Edit</strong> changes the same fields on an existing namespace.
      </Content>

      <Content component="h3">Deleting a namespace</Content>
      <Content component="p">
        <strong>Delete</strong> is rejected while the namespace still has collections
        associated with it — remove or reassign those first.
      </Content>
    </Content>
  );
}
