import { Content } from "@patternfly/react-core";

export function AdministrationPulpSigningServicesTopic() {
  return (
    <Content>
      <Content component="p">
        View the signing services available on the Pulp server. Choose{" "}
        <strong>View</strong> to inspect a public key.
      </Content>
      <Content component="p">
        Manage Pulpit's keys under <strong>Repository Signing</strong>. Adding other
        signing services requires a Pulp administrator.
      </Content>
    </Content>
  );
}
