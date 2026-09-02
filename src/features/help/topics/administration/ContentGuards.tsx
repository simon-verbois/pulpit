import { Content } from "@patternfly/react-core";

export function AdministrationContentGuardsTopic() {
  return (
    <Content>
      <Content component="p">
        A content guard is an extra access check a distribution can require before serving
        its content — on top of, or instead of, Pulp's normal authentication. This page
        manages the guard objects themselves; putting one in front of an actual
        distribution is currently done through Pulp's API directly, not from this page.
      </Content>

      <Content component="h3">Creating a guard</Content>
      <Content component="p">
        Click <strong>Create content guard</strong>, give it a <strong>Name</strong> and
        optional <strong>Description</strong>, and pick a <strong>Type</strong>:
      </Content>
      <Content component="ul">
        <Content component="li">
          <strong>Header</strong> — require a specific HTTP <strong>header name</strong>/
          <strong>value</strong> on every request; an optional <strong>jq filter</strong>{" "}
          can transform the header value before it's compared.
        </Content>
        <Content component="li">
          <strong>RBAC</strong> — require a Pulp role granted to the requesting user or
          one of their groups; no extra fields of its own.
        </Content>
        <Content component="li">
          <strong>Content redirect</strong> — Pulp's own internal mechanism behind signed
          content URLs; no extra fields, and not usually something you create by hand.
        </Content>
        <Content component="li">
          <strong>Composite</strong> — require every one of several other guards at once;
          pick which existing guards it requires from the checklist shown.
        </Content>
        <Content component="li">
          <strong>X.509</strong> / <strong>RHSM</strong> certificate — paste a PEM-encoded{" "}
          <strong>CA certificate</strong>; a client must present a certificate signed by
          it. RHSM validates the way <code>subscription-manager</code> does; X.509 is a
          plain client-cert check.
        </Content>
      </Content>

      <Content component="h3">Managing access to an RBAC guard</Content>
      <Content component="p">
        An <strong>RBAC</strong> guard's row has its own <strong>Access</strong> action —
        it's the exact same grant/revoke-a-role-to-users-or-groups control every
        repository's <strong>Access</strong> tab already has, just applied to the guard
        object itself instead of a repository.
      </Content>

      <Content component="h3">Editing and deleting</Content>
      <Content component="p">
        <strong>Edit</strong> lets you change a guard's fields (its type can't be changed
        after creation — create a new one instead). <strong>Delete</strong> removes it
        immediately; a confirmation is required first.
      </Content>

      <Content component="h3">Actually using a guard</Content>
      <Content component="p">
        Creating a guard does nothing on its own. To enforce it, set it as a
        distribution's content guard — this is currently done through Pulp's API directly
        (there is no field for it on PulpIT's own distribution create/edit forms yet).
      </Content>
    </Content>
  );
}
