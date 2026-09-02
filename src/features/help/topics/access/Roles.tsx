import { Content } from "@patternfly/react-core";

export function AccessRolesTopic() {
  return (
    <Content>
      <Content component="p">
        A role is a named bundle of permissions (e.g. "can sync this type of repository").
        Pulp ships roughly 180 <strong>built-in</strong> roles already — one set per
        content type per plugin — visible under the <strong>Built-in</strong> filter.
        Built-in roles can't be edited or deleted (their row shows no{" "}
        <strong>Edit</strong>/<strong>Delete</strong> actions at all); switch to the{" "}
        <strong>Custom</strong> filter for roles created here.
      </Content>

      <Content component="h3">Creating a custom role</Content>
      <Content component="p">
        Click <strong>Create role</strong> and give it a <strong>Name</strong> (Pulp's own
        convention is a dotted namespace, e.g. <code>my_org.rpm_publisher</code>), an
        optional description, and at least one permission from the{" "}
        <strong>Permissions</strong> picker.
      </Content>
      <Content component="p">
        The picker's list is built from permissions already used by <em>some</em> existing
        role, built-in or custom — Pulp has no endpoint that lists every permission that
        could ever exist, so a permission string that no role currently uses won't appear
        as an option. Use the filter box to search it; selected permissions show as
        removable labels above the list.
      </Content>

      <Content component="h3">Editing or deleting a role</Content>
      <Content component="p">
        Only custom roles show <strong>Edit</strong> (change name, description, or
        permissions) and <strong>Delete</strong> — a confirmation is required before
        deleting. A role by itself has no effect until it's assigned to a user or group
        (see the Users or Groups help topic).
      </Content>
    </Content>
  );
}
