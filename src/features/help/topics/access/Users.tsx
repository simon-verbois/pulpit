import { Content } from "@patternfly/react-core";

export function AccessUsersTopic() {
  return (
    <Content>
      <Content component="p">
        The <strong>Users</strong> list shows every Pulp account. Search by username, and
        click <strong>Create user</strong> to add one.
      </Content>

      <Content component="h3">Creating a user</Content>
      <Content component="p">
        Only a <strong>username</strong> is required. A password is optional at creation
        time — a user with no password can't log in with one until you set it.{" "}
        <strong>Email</strong> is optional too. <strong>Staff</strong> only grants access
        to Django's own admin site, on top of Pulp's API — it is not the same as full
        superuser access, which this UI can't grant at all (it requires server-side
        tooling).
      </Content>

      <Content component="h3">A user's own page</Content>
      <Content component="p">
        Click a username to open it. The <strong>Overview</strong> tab shows the account's
        name, email, active/inactive status, staff flag, and when it joined. From here:
      </Content>
      <Content component="ul">
        <Content component="li">
          <strong>Edit</strong> changes username, first/last name, email, Staff, and{" "}
          <strong>Active</strong> (an inactive account can't log in at all). Its{" "}
          <strong>New password</strong> field is write-only — Pulp never sends a password
          back, so it's always shown blank; leave it blank to keep the current password,
          or type a new one to replace it.
        </Content>
        <Content component="li">
          <strong>Delete user</strong> removes the account entirely, after a confirmation.
        </Content>
      </Content>

      <Content component="h3">Granting this user permissions</Content>
      <Content component="p">
        Use the <strong>Roles</strong> tab. <strong>Assign role…</strong> picks a role
        and, optionally, scopes it to one object:
      </Content>
      <Content component="ul">
        <Content component="li">
          Leave <strong>Scope to a specific object</strong> blank for a{" "}
          <strong>global</strong> assignment — the role applies everywhere, to every
          object of every type.
        </Content>
        <Content component="li">
          Paste an object's href (copyable from anywhere that object's own href is shown)
          to scope the role to <strong>that object only</strong>. In practice it's usually
          simpler to grant repository-level access from the repository's own{" "}
          <strong>Access</strong> tab instead (RPM/Containers/Ansible — see that section's
          help) rather than hunting down an href here.
        </Content>
      </Content>
      <Content component="p">
        Each row in the table shows one (role, scope) pair — <strong>Remove</strong>{" "}
        revokes just that one, leaving any other role this user holds untouched.
      </Content>
    </Content>
  );
}
