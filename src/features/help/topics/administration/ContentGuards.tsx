import { Content } from "@patternfly/react-core";

export function AdministrationContentGuardsTopic() {
  return (
    <Content>
      <Content component="p">
        A content guard controls who can download from a distribution. Choose{" "}
        <strong>Create content guard</strong> and a type:
      </Content>
      <Content component="ul">
        <Content component="li">
          <strong>Header</strong>: require a header value.
        </Content>
        <Content component="li">
          <strong>RBAC</strong>: allow users or groups with a role granted through{" "}
          <strong>Access</strong>.
        </Content>
        <Content component="li">
          <strong>X.509 / RHSM</strong>: require a client certificate trusted by your CA.
        </Content>
        <Content component="li">
          <strong>Composite</strong>: require several guards together.
        </Content>
      </Content>
      <Content component="p">
        Ask your Pulp administrator to attach the guard to a distribution. Creating it
        alone does not protect downloads.
      </Content>
    </Content>
  );
}
