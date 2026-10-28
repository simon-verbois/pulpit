import { Content } from "@patternfly/react-core";

export function AdministrationTlsTopic() {
  return (
    <Content>
      <Content component="p">Manage the HTTPS certificate used by Pulpit.</Content>
      <Content component="ul">
        <Content component="li">
          Use <strong>Regenerate self-signed certificate</strong> for a certificate
          managed and renewed by Pulpit. Browsers may ask you to trust it.
        </Content>
        <Content component="li">
          Under <strong>Manual → Upload certificate</strong>, paste a PEM certificate and
          its matching unencrypted private key. Replace imported certificates before they
          expire.
        </Content>
      </Content>
      <Content component="p">
        If a reverse proxy handles public HTTPS, manage the public certificate there.
      </Content>
    </Content>
  );
}
